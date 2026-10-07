import { supabase } from './supabase';

export type SavedLocationReference = { id: string; slug: string };

/** Load a user's saved IDs and claim older guest saves for the first signed-in account. */
export async function loadSavedLocationIds(
  locations: SavedLocationReference[],
  userId: string | null,
): Promise<Set<string> | null> {
  if (!userId) {
    return new Set(locations
      .filter((location) => window.localStorage.getItem(`balkan-nomad:saved:${location.slug}`) === 'true')
      .map((location) => location.id));
  }

  const { data, error } = await supabase
    .from('user_saved_locations')
    .select('location_id')
    .eq('user_id', userId);
  if (error) return null;

  const savedIds = new Set((data ?? []).map((row) => row.location_id));
  const guestSaves = locations.filter((location) =>
    !savedIds.has(location.id)
    && window.localStorage.getItem(`balkan-nomad:saved:${location.slug}`) === 'true');

  if (guestSaves.length) {
    const { error: importError } = await supabase.from('user_saved_locations').upsert(
      guestSaves.map((location) => ({ user_id: userId, location_id: location.id })),
      { onConflict: 'user_id,location_id', ignoreDuplicates: true },
    );
    if (!importError) {
      guestSaves.forEach((location) => {
        window.localStorage.removeItem(`balkan-nomad:saved:${location.slug}`);
        savedIds.add(location.id);
      });
      window.dispatchEvent(new Event('balkan-nomad:favorites-changed'));
    }
  }

  return savedIds;
}
