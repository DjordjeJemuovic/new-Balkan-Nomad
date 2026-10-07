'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Heart, Home, PlusCircle, Search, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

const FAVORITES_EVENT = 'balkan-nomad:show-favorites';
const SEARCH_EVENT = 'balkan-nomad:show-search';
const FAVORITES_REQUEST = 'balkan-nomad:open-favorites';
const SEARCH_REQUEST = 'balkan-nomad:open-search';

export default function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState('user');
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [activeView, setActiveView] = useState<'home' | 'favorites'>('home');

  useEffect(() => {
    const refreshFavorites = () => {
      let count = 0;
      for (let index = 0; index < window.localStorage.length; index++) {
        const key = window.localStorage.key(index);
        if (key?.startsWith('balkan-nomad:saved:') && window.localStorage.getItem(key) === 'true') count++;
      }
      setFavoriteCount(count);
    };

    const refreshRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setRole('user');
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      setRole(profile?.role ?? 'user');
    };

    refreshFavorites();
    void refreshRole();
    const onAuthChange = () => { window.setTimeout(() => void refreshRole(), 0); };
    window.addEventListener('storage', refreshFavorites);
    window.addEventListener('balkan-nomad:favorites-changed', refreshFavorites);
    const { data: authListener } = supabase.auth.onAuthStateChange(onAuthChange);
    return () => {
      window.removeEventListener('storage', refreshFavorites);
      window.removeEventListener('balkan-nomad:favorites-changed', refreshFavorites);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const goToHome = () => {
    setActiveView('home');
    if (pathname === '/') {
      window.dispatchEvent(new Event('balkan-nomad:show-home'));
    } else {
      router.push('/');
    }
  };

  const openSearch = () => {
    if (pathname === '/') {
      window.dispatchEvent(new Event(SEARCH_EVENT));
    } else {
      window.sessionStorage.setItem(SEARCH_REQUEST, 'true');
      router.push('/');
    }
  };

  const openFavorites = () => {
    setActiveView('favorites');
    if (pathname === '/') {
      window.dispatchEvent(new Event(FAVORITES_EVENT));
    } else {
      window.sessionStorage.setItem(FAVORITES_REQUEST, 'true');
      router.push('/');
    }
  };

  return (
    <nav aria-label="Glavna navigacija" className="fixed inset-x-0 bottom-0 z-[60] mx-auto flex w-full max-w-xl items-center justify-between gap-1 border-t border-gray-100 bg-white/95 px-2 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/95 sm:px-5">
      <button type="button" onClick={goToHome} aria-current={pathname === '/' && activeView === 'home' ? 'page' : undefined} className={`flex min-w-0 flex-1 flex-col items-center gap-1 ${pathname === '/' && activeView === 'home' ? 'text-[#006D44] dark:text-emerald-400' : 'text-gray-400 hover:text-[#006D44]'}`}>
        <Home className="h-5 w-5" /><span className="text-[10px] font-semibold">Početna</span>
      </button>
      <button type="button" onClick={openSearch} className="flex min-w-0 flex-1 flex-col items-center gap-1 text-gray-400 hover:text-[#006D44]">
        <Search className="h-5 w-5" /><span className="text-[10px] font-medium">Pretraga</span>
      </button>
      {role === 'admin' && <Link href="/admin/locations/new" className="flex min-w-0 flex-1 flex-col items-center gap-1 text-[#006D44] dark:text-emerald-400">
        <PlusCircle className="h-5 w-5" /><span className="text-center text-[9px] font-bold leading-3">Dodaj lokaciju</span>
      </Link>}
      <button type="button" onClick={openFavorites} aria-current={pathname === '/' && activeView === 'favorites' ? 'page' : undefined} className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 ${pathname === '/' && activeView === 'favorites' ? 'text-rose-500' : 'text-gray-400 hover:text-rose-500'}`}>
        <Heart className="h-5 w-5" /><span className="text-[10px] font-medium">Omiljeno</span>{favoriteCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 text-[9px] font-bold text-white">{favoriteCount}</span>}
      </button>
      <Link href="/profile" aria-current={pathname === '/profile' ? 'page' : undefined} className={`flex min-w-0 flex-1 flex-col items-center gap-1 ${pathname === '/profile' ? 'text-[#006D44] dark:text-emerald-400' : 'text-gray-400 hover:text-[#006D44]'}`}>
        <User className="h-5 w-5" /><span className="text-[10px] font-medium">Profil</span>
      </Link>
    </nav>
  );
}
