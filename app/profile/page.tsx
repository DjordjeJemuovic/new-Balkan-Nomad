'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Check, Heart, Loader2, LogIn, Save, UserRound } from 'lucide-react';
import { supabase } from '../../src/lib/supabase';

const INTEREST_OPTIONS = [
  'Priroda i planinarenje',
  'Gradovi i kultura',
  'More i plaže',
  'Hrana i piće',
  'Avantura i sport',
  'Porodična putovanja',
];

type ProfileUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

type SavedLocation = {
  id: string;
  slug: string;
  title: string;
  country?: string;
  region?: string;
  cover_image?: string | null;
  short_description?: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  const syncFavorites = useCallback(() => {
    const slugs = locations
      .filter((location) => window.localStorage.getItem(`balkan-nomad:saved:${location.slug}`) === 'true')
      .map((location) => location.slug);
    setFavoriteSlugs(slugs);
  }, [locations]);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      const [{ data: { session } }, { data: locationRows }] = await Promise.all([
        supabase.auth.getSession(),
        supabase.from('locations').select('id, slug, title, country, region, cover_image, short_description').order('title'),
      ]);
      if (!active) return;

      const currentUser = session?.user as ProfileUser | undefined;
      if (currentUser) {
        const metadata = currentUser.user_metadata ?? {};
        setUser(currentUser);
        setFirstName(typeof metadata.first_name === 'string' ? metadata.first_name : '');
        setLastName(typeof metadata.last_name === 'string' ? metadata.last_name : '');
        setBirthYear(typeof metadata.birth_year === 'number' || typeof metadata.birth_year === 'string' ? String(metadata.birth_year) : '');
        setInterests(Array.isArray(metadata.interests) ? metadata.interests.filter((value): value is string => typeof value === 'string') : []);
        setAvatarUrl(typeof metadata.avatar_url === 'string' ? metadata.avatar_url : '');
      }
      const allLocations = (locationRows ?? []) as SavedLocation[];
      setLocations(allLocations);
      setFavoriteSlugs(allLocations
        .filter((location) => window.localStorage.getItem(`balkan-nomad:saved:${location.slug}`) === 'true')
        .map((location) => location.slug));
      setLoading(false);
    }
    void loadProfile();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    window.addEventListener('storage', syncFavorites);
    window.addEventListener('focus', syncFavorites);
    window.addEventListener('balkan-nomad:favorites-changed', syncFavorites);
    return () => {
      window.removeEventListener('storage', syncFavorites);
      window.removeEventListener('focus', syncFavorites);
      window.removeEventListener('balkan-nomad:favorites-changed', syncFavorites);
    };
  }, [syncFavorites]);

  useEffect(() => () => {
    if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  const toggleInterest = (interest: string) => {
    setInterests((current) => current.includes(interest)
      ? current.filter((item) => item !== interest)
      : [...current, interest]);
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setAvatarFile(file);
    setAvatarPreview(file ? URL.createObjectURL(file) : '');
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage('');
    try {
      let nextAvatarUrl = avatarUrl;
      if (avatarFile) {
        if (!avatarFile.type.startsWith('image/')) throw new Error('Izabrani fajl mora biti slika.');
        if (avatarFile.size > 5 * 1024 * 1024) throw new Error('Fotografija može biti velika najviše 5 MB.');
        const extension = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `profiles/${user.id}/${Date.now()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from('locations').upload(path, avatarFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: avatarFile.type,
        });
        if (uploadError) throw new Error(`Fotografija nije sačuvana: ${uploadError.message}`);
        const { data } = supabase.storage.from('locations').getPublicUrl(path);
        nextAvatarUrl = data.publicUrl;
      }

      const { data, error } = await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          birth_year: Number(birthYear),
          interests,
          avatar_url: nextAvatarUrl,
        },
      });
      if (error) throw error;
      if (data.user) setUser(data.user as ProfileUser);
      setAvatarUrl(nextAvatarUrl);
      setAvatarFile(null);
      setAvatarPreview('');
      setEditing(false);
      setMessage('Profil je uspešno sačuvan.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Došlo je do greške pri čuvanju profila.');
    } finally {
      setSaving(false);
    }
  };

  const savedLocations = locations.filter((location) => favoriteSlugs.includes(location.slug));
  const displayedAvatar = avatarPreview || avatarUrl;
  const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white';

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl bg-slate-50 px-4 pb-28 pt-5 dark:bg-zinc-950 sm:px-6">
      <header className="mb-6 flex items-center gap-3">
        <button type="button" onClick={() => router.back()} aria-label="Vrati se nazad" className="rounded-full border border-gray-200 bg-white p-2.5 text-zinc-700 shadow-sm transition hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">Balkan Nomad</p>
          <h1 className="text-2xl font-black text-zinc-950 dark:text-white">Moj profil</h1>
        </div>
      </header>

      {loading ? <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-emerald-700" /></div>
        : !user ? <section className="rounded-3xl border border-gray-200 bg-white p-7 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"><UserRound className="h-7 w-7" /></div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Prijavi se za svoj profil</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">Kada se prijaviš, ovde ćeš moći da vidiš i izmeniš svoje podatke i sačuvane destinacije.</p>
          <Link href="/login" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#006D44] px-5 py-3 text-sm font-semibold text-white hover:bg-[#004D30"><LogIn className="h-4 w-4" />Prijava</Link>
        </section>
        : <div className="space-y-6">
          <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="h-24 bg-gradient-to-r from-emerald-800 via-emerald-600 to-lime-500" />
            <div className="px-5 pb-5 sm:px-7">
              <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
                <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-emerald-50 text-emerald-800 shadow-md dark:border-zinc-900 dark:bg-emerald-950 dark:text-emerald-300">
                  {displayedAvatar ? <img src={displayedAvatar} alt="Profilna fotografija" className="h-full w-full object-cover" /> : <UserRound className="h-11 w-11" />}
                </div>
                {!editing && <button type="button" onClick={() => { setMessage(''); setEditing(true); }} className="mb-1 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"><UserRound className="h-4 w-4" />Izmeni profil</button>}
              </div>

              {editing ? <form onSubmit={saveProfile} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Ime<input required autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} className={`${inputClass} mt-1.5`} /></label>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Prezime<input required autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} className={`${inputClass} mt-1.5`} /></label>
                </div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Godina rođenja<input required type="number" min="1900" max={new Date().getFullYear()} value={birthYear} onChange={(event) => setBirthYear(event.target.value)} className={`${inputClass} mt-1.5`} /></label>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Profilna fotografija
                  <span className="mt-1.5 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 hover:border-emerald-600 dark:border-zinc-700 dark:text-zinc-400"><Camera className="h-4 w-4" />Izaberi sliku (do 5 MB)<input type="file" accept="image/*" onChange={handleAvatarChange} className="sr-only" /></span>
                </label>
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Interesovanja <span className="font-normal text-gray-500">(opciono)</span></legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {INTEREST_OPTIONS.map((interest) => <label key={interest} className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"><input type="checkbox" checked={interests.includes(interest)} onChange={() => toggleInterest(interest)} className="h-4 w-4 accent-[#006D44]" />{interest}</label>)}
                  </div>
                </fieldset>
                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#006D44] px-4 py-3 text-sm font-semibold text-white hover:bg-[#004D30] disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Sačuvaj izmene</button>
                  <button type="button" disabled={saving} onClick={() => { setEditing(false); setAvatarFile(null); setAvatarPreview(''); }} className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">Otkaži</button>
                </div>
              </form> : <div className="mt-4">
                <h2 className="text-xl font-bold text-zinc-950 dark:text-white">{[firstName, lastName].filter(Boolean).join(' ') || 'Putnik'}</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">{user.email}</p>
                <dl className="mt-5 grid gap-4 border-t border-gray-100 pt-4 text-sm dark:border-zinc-800 sm:grid-cols-2">
                  <div><dt className="text-gray-500 dark:text-zinc-400">Godina rođenja</dt><dd className="mt-1 font-semibold text-zinc-900 dark:text-white">{birthYear || 'Nije uneta'}</dd></div>
                  <div><dt className="text-gray-500 dark:text-zinc-400">Interesovanja</dt><dd className="mt-1 font-semibold text-zinc-900 dark:text-white">{interests.length ? interests.join(', ') : 'Još nisu izabrana'}</dd></div>
                </dl>
              </div>}
              {message && <p role="status" className={`mt-4 rounded-xl px-4 py-3 text-sm ${message.startsWith('Profil je') ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'}`}>{message.startsWith('Profil je') && <Check className="mr-1 inline h-4 w-4" />}{message}</p>}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><Heart className="h-5 w-5 fill-rose-500 text-rose-500" /><h2 className="text-lg font-bold text-zinc-950 dark:text-white">Sačuvane destinacije</h2></div>
              <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">{savedLocations.length} sačuvano</span>
            </div>
            {savedLocations.length ? <div className="grid gap-3 sm:grid-cols-2">
              {savedLocations.map((location) => <Link key={location.id} href={`/locations/${location.slug}`} className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
                <div className="relative h-36 bg-gray-100 dark:bg-zinc-800">{location.cover_image && <img src={location.cover_image} alt={location.title} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />}</div>
                <div className="p-4"><h3 className="font-bold text-zinc-900 dark:text-white">{location.title}</h3><p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">{[location.region, location.country].filter(Boolean).join(', ')}</p>{location.short_description && <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-zinc-400">{location.short_description}</p>}</div>
              </Link>)}
            </div> : <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center dark:border-zinc-700 dark:bg-zinc-900"><Heart className="mx-auto h-6 w-6 text-gray-400" /><p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">Još nemaš sačuvanih destinacija.</p><Link href="/" className="mt-3 inline-block text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400">Istraži destinacije</Link></div>}
          </section>
        </div>}
    </main>
  );
}
