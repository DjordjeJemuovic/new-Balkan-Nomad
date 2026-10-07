'use client';

import { useState } from 'react';
import { supabase } from '../../src/lib/supabase';
import { useRouter } from 'next/navigation';

const INTEREST_OPTIONS = [
  'Priroda i planinarenje',
  'Gradovi i kultura',
  'More i plaže',
  'Hrana i piće',
  'Avantura i sport',
  'Porodična putovanja',
];

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showUnavailablePopup, setShowUnavailablePopup] = useState(false);
  const router = useRouter();

  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    if (isRegister) {
      const normalizedEmail = email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        setMessage('Unesi ispravnu email adresu koja sadrži @ i tačku.');
        return;
      }
      if (password.length < 8 || !/[A-ZČĆŠĐŽ]/.test(password) || !/[0-9]/.test(password)) {
        setMessage('Lozinka mora imati najmanje 8 karaktera, jedno veliko slovo i jedan broj.');
        return;
      }
      if (password !== confirmPassword) {
        setMessage('Lozinke se ne poklapaju.');
        return;
      }

      setShowUnavailablePopup(true);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        setMessage(`Greška pri prijavi: ${error?.message || 'Nalog nije pronađen.'}`);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError || profile?.role !== 'admin') {
        await supabase.auth.signOut();
        setShowUnavailablePopup(true);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setMessage('Došlo je do greške pri prijavi. Pokušaj ponovo.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setAvatarPreview('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const toggleInterest = (interest: string) => {
    setInterests((current) => current.includes(interest)
      ? current.filter((item) => item !== interest)
      : [...current, interest]);
  };

  const inputClass = 'w-full rounded-xl border border-gray-200 bg-transparent px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#006D44] dark:border-zinc-700 dark:text-white';
  const labelClass = 'mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-8 pb-28 transition-colors duration-200 dark:bg-zinc-950 sm:px-6">
      <div className={`w-full ${isRegister ? 'max-w-2xl' : 'max-w-md'} rounded-3xl border border-gray-100 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 sm:p-8`}>
        <div className="mb-8 flex flex-col items-center">
          <span className="text-2xl font-black tracking-wider text-[#006D44]">BALKAN NOMAD</span>
          <p className="mt-2 text-center text-sm text-gray-500 dark:text-zinc-400">
            {isRegister ? 'Kreiraj profil i kreni u avanturu' : 'Prijavi se da istražiš Balkan'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegister && <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className={labelClass}>Ime</label>
                <input id="firstName" autoComplete="given-name" required value={firstName} onChange={(event) => setFirstName(event.target.value)} className={inputClass} placeholder="Unesi ime" />
              </div>
              <div>
                <label htmlFor="lastName" className={labelClass}>Prezime</label>
                <input id="lastName" autoComplete="family-name" required value={lastName} onChange={(event) => setLastName(event.target.value)} className={inputClass} placeholder="Unesi prezime" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="birthYear" className={labelClass}>Godina rođenja</label>
                <input id="birthYear" type="number" inputMode="numeric" min="1900" max={new Date().getFullYear()} required value={birthYear} onChange={(event) => setBirthYear(event.target.value)} className={inputClass} placeholder="npr. 1995" />
              </div>
              <div>
                <label htmlFor="avatar" className={labelClass}>Profilna fotografija</label>
                <input id="avatar" type="file" accept="image/*" required onChange={handlePhotoChange} className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-semibold file:text-[#006D44] hover:file:bg-emerald-100 dark:text-zinc-300 dark:file:bg-emerald-950/40 dark:file:text-emerald-300" />
              </div>
            </div>

            {avatarPreview && <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarPreview} alt="Pregled profilne fotografije" className="h-16 w-16 rounded-full object-cover" />
              <span className="text-sm text-gray-500 dark:text-zinc-400">Pregled profilne fotografije</span>
            </div>}

            <fieldset>
              <legend className={`${labelClass} mb-2`}>Šta te najviše zanima?</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {INTEREST_OPTIONS.map((interest) => <label key={interest} className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 dark:border-zinc-700 dark:text-zinc-300">
                  <input type="checkbox" checked={interests.includes(interest)} onChange={() => toggleInterest(interest)} className="h-4 w-4 accent-[#006D44]" />
                  {interest}
                </label>)}
              </div>
            </fieldset>
          </>}

          <div>
            <label htmlFor="email" className={labelClass}>Email adresa</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ime@primer.com" className={inputClass} />
          </div>

          <div className={isRegister ? 'grid gap-4 sm:grid-cols-2' : ''}>
            <div>
              <label htmlFor="password" className={labelClass}>Lozinka</label>
              <input id="password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={isRegister ? 8 : undefined} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isRegister ? '8+ karaktera, veliko slovo i broj' : 'Lozinka'} className={inputClass} />
            </div>
            {isRegister && <div>
              <label htmlFor="confirmPassword" className={labelClass}>Potvrdi lozinku</label>
              <input id="confirmPassword" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Ponovi lozinku" className={inputClass} />
            </div>}
          </div>

          {isRegister && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">Registracija je trenutno zatvorena. Ovaj obrazac služi za pripremu profila; nalog se još ne kreira.</p>}

          <button type="submit" disabled={loading} className="mt-2 w-full rounded-xl bg-[#006D44] py-3 font-semibold text-white shadow-md transition duration-200 hover:bg-[#004D30] disabled:opacity-50">
            {loading ? 'Učitavanje...' : isRegister ? 'Registracija trenutno nije dostupna' : 'Prijavi se'}
          </button>
        </form>

        {message && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-center text-sm font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400">{message}</p>}

        <div className="mt-6 text-center">
          <button type="button" onClick={() => { setIsRegister(!isRegister); setMessage(''); }} className="text-sm font-semibold text-[#006D44] hover:underline dark:text-emerald-400">
            {isRegister ? 'Već imaš nalog? Prijavi se' : 'Nemaš nalog? Registruj se'}
          </button>
        </div>
      </div>

      {showUnavailablePopup && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-5 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowUnavailablePopup(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="auth-unavailable-title" className="w-full max-w-sm rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl text-[#006D44] dark:bg-emerald-950/50 dark:text-emerald-400">✦</div>
          <h2 id="auth-unavailable-title" className="text-lg font-bold text-zinc-900 dark:text-white">Registracija će biti moguća uskoro</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-zinc-400">Prijava i registracija su trenutno dostupne samo administratoru.</p>
          <button type="button" onClick={() => setShowUnavailablePopup(false)} className="mt-5 w-full rounded-xl bg-[#006D44] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#004D30]">U redu</button>
        </section>
      </div>}
    </div>
  );
}
