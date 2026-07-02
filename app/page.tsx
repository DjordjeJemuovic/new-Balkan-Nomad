'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../src/lib/supabase';
import Link from 'next/link';
import { Home, Search, Heart, User, PlusCircle } from 'lucide-react';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>('user');

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
          
        if (profile) setRole(profile.role);
      }
    }
    checkUser();
  }, []);

  return (
    <div className="max-w-xl mx-auto min-h-screen bg-white dark:bg-zinc-900 pb-24 shadow-sm transition-colors duration-200">
      
      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex flex-col">
          <span className="text-xl font-black text-[#006D44] tracking-wider">BALKAN NOMAD</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <button 
              onClick={async () => { 
                await supabase.auth.signOut(); 
                setUser(null); 
                setRole('user'); 
              }}
              className="text-xs text-red-500 font-medium border border-red-200 px-3 py-1.5 rounded-full"
            >
              Odjavi se
            </button>
          ) : (
            <Link href="/login" className="text-xs bg-[#006D44] text-white font-medium px-4 py-1.5 rounded-full">
              Prijavi se
            </Link>
          )}
        </div>
      </div>

      {/* HERO SEKCIJA */}
      <div className="px-4 mb-6">
        <div className="relative h-64 rounded-3xl overflow-hidden bg-zinc-800 flex items-end p-6">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10" />
          <img 
            src="https://images.unsplash.com/photo-1549880338-65ddcdfd017b?auto=format&fit=crop&w=800&q=80" 
            alt="Nature" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="relative z-20 text-white space-y-2">
            <h2 className="text-2xl font-bold leading-tight">Otkrij najljepše<br />lokacije u Srbiji</h2>
            <p className="text-xs text-zinc-300">Planine, vidikovci, banje i još mnogo toga.</p>
          </div>
        </div>

        {/* PRETRAGA */}
        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Pretraži lokacije, regije, aktivnosti..." 
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl text-sm focus:outline-none text-zinc-950 dark:text-white"
            />
          </div>
          <button className="p-3.5 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-zinc-700 dark:text-zinc-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-6 py-12 text-center text-gray-400 text-sm">
        Sadržaj kartica i preporučenih lokacija radimo čim prođe auth test!
      </div>

      {/* 📱 FIKSNI DONJI MENI */}
      <div className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-t border-gray-100 dark:border-zinc-800 px-6 py-3 flex justify-between items-center z-50">
        <button className="flex flex-col items-center gap-1 text-[#006D44] dark:text-emerald-500">
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-bold">Početna</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-zinc-600">
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-medium">Pretraga</span>
        </button>

        {/* Prikazuje se samo ako si Admin u bazi */}
        {role === 'admin' && (
          <Link href="/admin/locations/new" className="flex flex-col items-center gap-1 text-emerald-600 hover:text-emerald-700">
            <PlusCircle className="w-5 h-5 text-[#006D44]" />
            <span className="text-[10px] font-bold text-[#006D44]">Dodaj lokaciju</span>
          </Link>
        )}

        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-zinc-600">
          <Heart className="w-5 h-5" />
          <span className="text-[10px] font-medium">Omiljeno</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-zinc-600">
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium">Profil</span>
        </button>
      </div>

    </div>
  );
}