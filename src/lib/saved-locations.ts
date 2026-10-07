import { supabase } from './supabase';

const STORAGE_PREFIX = 'balkan-nomad:saved:';

function getLocalSlugs() {
  if (typeof window === 'undefined') return [];
  return Object.keys(window.localStorage)
    .filter((key) => key.startsWith(STORAGE_PREFIX) && window.localStorage.getItem(key) === 'true')
    .map((key) => key.slice(STORAGE_PREFIX.length));
}

export async function loadSavedLocationIds(userId: string | null) {
  const localSlugs = getLocalSlugs();

  if (!userId) {
    if (!localSlugs.length) return new Set<string>();
    const { data, error } = await supabase.from('locations').select('id').in('slug', localSlugs);
    return error ? null : new Set((data ?? []).map((row) => row.id as string));
  }

  const [{ data: savedRows, error: savedError }, { data: localRows, error: localError }] = await Promise.all([
    supabase.from('user_saved_locations').select('location_id').eq('user_id', userId),
    localSlugs.length
      ? supabase.from('locations').select('id, slug').in('slug', localSlugs)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (savedError || localError) return null;

  const ids = new Set<string>((savedRows ?? []).map((row) => row.location_id as string));
  const imports = (localRows ?? []).filter((row) => !ids.has(row.id)).map((row) => ({ user_id: userId, location_id: row.id }));
  if (imports.length) {
    const { error } = await supabase.from('user_saved_locations').upsert(imports, { onConflict: 'user_id,location_id', ignoreDuplicates: true });
    if (error) return null;
    imports.forEach((row) => ids.add(row.location_id));
    localSlugs.forEach((slug) => window.localStorage.removeItem(`${STORAGE_PREFIX}${slug}`));
    window.dispatchEvent(new Event('balkan-nomad:favorites-changed'));
  }
  return ids;
}
