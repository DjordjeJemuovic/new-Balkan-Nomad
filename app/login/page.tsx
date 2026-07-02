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
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (isRegister) {
      // Sada šaljemo čist zahtev, a baza sama radi magiju sa emailom
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        setMessage(`Greška: ${error.message}`);
      } else {
        setMessage('Uspešna registracija! Sada se možeš ulogovati.');
        setIsRegister(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(`Greška pri prijavi: ${error.message}`);
      } else {
        router.push('/');
        router.refresh();
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-slate-50 dark:bg-zinc-950 transition-colors duration-200">
      <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-gray-100 dark:border-zinc-800">
        
        <div className="flex flex-col items-center mb-8">
          <span className="text-2xl font-black text-[#006D44] tracking-wider">BALKAN NOMAD</span>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2">
            {isRegister ? 'Kreiraj nalog i kreni u avanturu' : 'Prijavi se da istražiš Balkan'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Email adresa</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ime@primer.com"
              className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-700 rounded-xl bg-transparent focus:ring-2 focus:ring-[#006D44] focus:outline-none dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Lozinka</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-700 rounded-xl bg-transparent focus:ring-2 focus:ring-[#006D44] focus:outline-none dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 bg-[#006D44] hover:bg-[#004D30] text-white font-semibold rounded-xl transition duration-200 shadow-md disabled:opacity-50"
          >
            {loading ? 'Učitavanje...' : isRegister ? 'Registruj se' : 'Prijavi se'}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-sm text-center font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl">
            {message}
          </p>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setMessage('');
            }}
            className="text-sm text-[#006D44] dark:text-emerald-400 font-semibold hover:underline"
          >
            {isRegister ? 'Već imaš nalog? Prijavi se' : 'Nemaš nalog? Registruj se'}
          </button>
        </div>

      </div>
    </div>
  );
}