'use client';

import { useState } from 'react';
import { supabase } from '../../src/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showUnavailablePopup, setShowUnavailablePopup] = useState(false);
  const router = useRouter();

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');

    if (isRegister) {
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 transition-colors duration-200 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-8 flex flex-col items-center">
          <span className="text-2xl font-black tracking-wider text-[#006D44]">BALKAN NOMAD</span>
          <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
            {isRegister ? 'Kreiraj nalog i kreni u avanturu' : 'Prijavi se da istražiš Balkan'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Email adresa</label>
            <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ime@primer.com" className="w-full rounded-xl border border-gray-200 bg-transparent px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#006D44] dark:border-zinc-700 dark:text-white" />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Lozinka</label>
            <input id="password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" className="w-full rounded-xl border border-gray-200 bg-transparent px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#006D44] dark:border-zinc-700 dark:text-white" />
          </div>

          <button type="submit" disabled={loading} className="mt-2 w-full rounded-xl bg-[#006D44] py-3 font-semibold text-white shadow-md transition duration-200 hover:bg-[#004D30] disabled:opacity-50">
            {loading ? 'Učitavanje...' : isRegister ? 'Registruj se' : 'Prijavi se'}
          </button>
        </form>

        {message && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-center text-sm font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400">{message}</p>}

        <div className="mt-6 text-center">
          <button type="button" onClick={() => { setIsRegister(!isRegister); setMessage(''); }} className="text-sm font-semibold text-[#006D44] hover:underline dark:text-emerald-400">
            {isRegister ? 'Već imaš nalog? Prijavi se' : 'Nemaš nalog? Registruj se'}
          </button>
        </div>
      </div>

      {showUnavailablePopup && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-5 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowUnavailablePopup(false); }}>
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
