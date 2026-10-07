'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../src/lib/supabase';
import Link from 'next/link';
import { Search, MapPin, Compass, Trash2, Loader2, Globe, Pencil, X } from 'lucide-react';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>('user');
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeView, setActiveView] = useState<'home' | 'favorites'>('home');
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);

  // Stanja za napredno filtriranje na klijentu
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('__all__');

  const refreshFavorites = useCallback(() => {
    const favorites = locations
      .filter((location) => window.localStorage.getItem(`balkan-nomad:saved:${location.slug}`) === 'true')
      .map((location) => location.slug);
    setFavoriteSlugs(favorites);
  }, [locations]);

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        if (profile) setRole(profile.role);
      }
    }

    async function fetchLocations() {
      setLoading(true);
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setLocations(data);
        setFavoriteSlugs(data
          .filter((location) => window.localStorage.getItem(`balkan-nomad:saved:${location.slug}`) === 'true')
          .map((location) => location.slug));
      }
      setLoading(false);
    }

    checkUser();
    fetchLocations();
  }, []);

  useEffect(() => {
    const syncFavorites = () => refreshFavorites();
    const showHome = () => setActiveView('home');
    const showFavorites = () => { refreshFavorites(); setActiveView('favorites'); };
    const showSearch = () => setIsSearchOpen(true);
    if (window.sessionStorage.getItem('balkan-nomad:open-favorites') === 'true') {
      window.sessionStorage.removeItem('balkan-nomad:open-favorites');
      showFavorites();
    }
    if (window.sessionStorage.getItem('balkan-nomad:open-search') === 'true') {
      window.sessionStorage.removeItem('balkan-nomad:open-search');
      showSearch();
    }
    window.addEventListener('balkan-nomad:show-home', showHome);
    window.addEventListener('balkan-nomad:show-favorites', showFavorites);
    window.addEventListener('balkan-nomad:show-search', showSearch);
    window.addEventListener('balkan-nomad:favorites-changed', syncFavorites);
    window.addEventListener('storage', syncFavorites);
    window.addEventListener('focus', syncFavorites);
    return () => {
      window.removeEventListener('balkan-nomad:show-home', showHome);
      window.removeEventListener('balkan-nomad:show-favorites', showFavorites);
      window.removeEventListener('balkan-nomad:show-search', showSearch);
      window.removeEventListener('balkan-nomad:favorites-changed', syncFavorites);
      window.removeEventListener('storage', syncFavorites);
      window.removeEventListener('focus', syncFavorites);
    };
  }, [refreshFavorites]);

  const handleDelete = async (id: string, title: string) => {
    const confirmDelete = window.confirm(`Da li si siguran da Å¾eliÅ¡ trajno da obriÅ¡eÅ¡ lokaciju: "${title}"?`);
    if (!confirmDelete) return;

    setDeletingId(id);
    const { error } = await supabase.from('locations').delete().eq('id', id);

    if (error) {
      alert(`GreÅ¡ka pri brisanju: ${error.message}`);
    } else {
      setLocations(locations.filter(loc => loc.id !== id));
    }
    setDeletingId(null);
  };

  // Kombinovana pretraga (unos teksta) i filter drÅ¾ava (padajuÄ‡i meni)
  const filteredLocations = locations.filter((loc) => {
    const matchesSearch =
      loc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (loc.region && loc.region.toLowerCase().includes(searchQuery.toLowerCase())) ||
      loc.short_description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCountry = selectedCountry === '__all__' || loc.country === selectedCountry;

    return matchesSearch && matchesCountry;
  });
  const visibleLocations = activeView === 'favorites'
    ? locations.filter((location) => favoriteSlugs.includes(location.slug))
    : filteredLocations;

  return (
    <div className="mx-auto min-h-screen w-full max-w-xl bg-white pb-28 shadow-sm transition-colors duration-200 dark:bg-zinc-950">

      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-50 px-4 py-4 dark:border-zinc-900 sm:px-6">
        <span className="text-lg font-black tracking-wider text-[#006D44] sm:text-xl">BALKAN NOMAD</span>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {user ? (
            <>
              {role === 'admin' && (
                <Link href="/admin/locations/new" className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-[#006D44] dark:text-emerald-400 font-semibold px-4 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-900/60 hover:bg-emerald-100/70 transition">
                  Nova destinacija
                </Link>
              )}
              <button onClick={async () => { await supabase.auth.signOut(); setUser(null); setRole('user'); }} className="text-xs text-red-500 font-medium border border-red-200 dark:border-red-900/40 px-3 py-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/20 transition">
                Odjavi se
              </button>
            </>
          ) : (
            <Link href="/login" className="text-xs bg-[#006D44] text-white font-medium px-4 py-1.5 rounded-full hover:bg-[#004D30] transition">
              Prijavi se
            </Link>
          )}
        </div>
      </div>

      {/* HERO SEKCIJA */}
      <div className="px-4 mt-4 mb-6">
        <div className="relative h-56 rounded-3xl overflow-hidden bg-zinc-800 flex items-end p-6">
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-10" />
          <img
            src="https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80"
            alt="Planinski pejzaÅ¾ Balkana"
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
          <div className="relative z-20 text-white space-y-1">
            <h2 className="text-xl font-black leading-tight tracking-tight">KREÄ†E BALKANSKA AVANTURA</h2>
            <p className="text-xs text-zinc-300">Sve rute, skriveni kutkovi i divljina na jednom mestu.</p>
          </div>
        </div>

        {/* PRETRAGA I SELEKTOR */}
        <div className="mt-4 space-y-2">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="PretraÅ¾i naziv, regiju..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none text-zinc-950 dark:text-white font-medium"
            />
          </div>

          <div className="relative">
            <Globe className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none text-zinc-950 dark:text-white font-semibold appearance-none cursor-pointer"
            >
              <option value="__all__">Sve države Balkana</option>
              <option value="Srbija">Srbija</option>
              <option value="Crna Gora">Crna Gora</option>
              <option value="Bosna i Hercegovina">Bosna i Hercegovina</option>
              <option value="Hrvatska">Hrvatska</option>
              <option value="Severna Makedonija">Severna Makedonija</option>
              <option value="Albanija">Albanija</option>
              <option value="Slovenija">Slovenija</option>
              <option value="Bugarska">Bugarska</option>
              <option value="GrÄka">GrÄka</option>
              <option value="Rumunija">Rumunija</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>
      </div>

      {/* KARTICE SA LOKACIJAMA */}
      <div className="px-4 space-y-4">
        <div className="flex items-center justify-between px-2 mb-2">
          <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200 tracking-wide uppercase flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-[#006D44]" />
            {activeView === 'favorites' ? 'Omiljene lokacije' : selectedCountry === '__all__' ? 'Preporučene destinacije' : `Destinacije — ${selectedCountry}`}
          </h3>
          <span className="text-xs text-gray-400 font-medium">{visibleLocations.length} {activeView === 'favorites' ? 'saÄuvano' : 'naÄ‘eno'}</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400 font-medium animate-pulse">
            UÄitavanje destinacija sa servera...
          </div>
        ) : visibleLocations.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400 bg-gray-50 dark:bg-zinc-900/40 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 px-6">
            {activeView === 'favorites' ? 'JoÅ¡ nemaÅ¡ saÄuvanih omiljenih lokacija. Otvori destinaciju i dodirni srce da je saÄuvaÅ¡.' : 'Nema pronaÄ‘enih lokacija za zadate filtere.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {visibleLocations.map((loc) => {
              // Ispisujemo objekat u konzolu da na licu mesta vidiÅ¡ Å¡ta baza taÄno vraÄ‡a
              console.log("Podaci iz baze za lokaciju:", loc.title, loc);

              // Provera alternativnih naziva kolona ako cover_image vrati prazno
              const imageSource = loc.cover_image || loc.cover_url || loc.image || "https://placeholder.co/800x450/27272a/ffffff?text=Nema+Slike+u+Bazi";

              return (
                <div key={loc.id} className="group relative bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-900 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition duration-200">

                  {/* Admin akcije */}
                  {role === 'admin' && (
                    <div className="absolute top-4 left-4 flex gap-2 z-30">
                      <Link
                        href={`/admin/locations/${loc.slug}/edit`}
                        className="p-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-xl text-[#006D44] hover:text-emerald-700 shadow-sm transition"
                        aria-label={`Izmeni lokaciju ${loc.title}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(loc.id, loc.title)}
                        disabled={deletingId === loc.id}
                        className="p-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-xl text-red-500 hover:text-red-700 shadow-sm transition"
                        aria-label={`ObriÅ¡i lokaciju ${loc.title}`}
                      >
                        {deletingId === loc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  )}

                  {/* DINAMIÄŒKI LINK */}
                  <Link href={`/locations/${loc.slug}`} className="block cursor-pointer">
                    <div className="relative h-48 w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <img
                        src={imageSource}
                        alt={loc.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />

                      {loc.difficulty && (
                        <span className={`absolute top-4 right-4 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full shadow-sm text-white ${
                          loc.difficulty === 'Lako' ? 'bg-emerald-600' : loc.difficulty === 'Srednje' ? 'bg-amber-600' : 'bg-red-600'
                        }`}>
                          {loc.difficulty}
                        </span>
                      )}
                    </div>

                    <div className="p-5 space-y-2">
                      <div className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span>{loc.region ? `${loc.region}, ` : ''}{loc.country}</span>
                      </div>

                      <h4 className="text-base font-black text-zinc-900 dark:text-white tracking-tight group-hover:text-[#006D44] dark:group-hover:text-emerald-400 transition">
                        {loc.title}
                      </h4>

                      {loc.short_description && (
                        <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                          {loc.short_description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-50 dark:border-zinc-800/60 mt-3">
                        <span className="text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-md uppercase">
                          #{loc.category_id}
                        </span>
                        {loc.child_friendly && <span className="text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md">ðŸ‘¶ Deca OK</span>}
                        {loc.pet_allowed && <span className="text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-md">ðŸ¾ Pet Friendly</span>}
                        {loc.parking_available && <span className="text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md">ðŸš— Parking</span>}
                      </div>
                    </div>
                  </Link>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {isSearchOpen && <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 px-3 pb-3 pt-10 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsSearchOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="search-dialog-title" className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-zinc-800">
            <div>
              <h2 id="search-dialog-title" className="text-base font-bold text-zinc-900 dark:text-white">PretraÅ¾i destinacije</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">PretraÅ¾i po nazivu, regiji ili opisu.</p>
            </div>
            <button type="button" onClick={() => setIsSearchOpen(false)} aria-label="Zatvori pretragu" className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
          </div>
          <div className="space-y-3 p-4">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input autoFocus type="search" placeholder="Naziv, regija ili opis..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3.5 pl-12 pr-4 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white" />
            </div>
            <select aria-label="Filtriraj po drÅ¾avi" value={selectedCountry} onChange={(event) => setSelectedCountry(event.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white">
              <option value="__all__">Sve države Balkana</option>
              {[...new Set(locations.map((location) => location.country).filter(Boolean))].sort().map((country) => <option key={country} value={country}>{country}</option>)}
            </select>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto border-t border-gray-100 px-4 py-2 dark:border-zinc-800">
            {loading ? <p className="py-8 text-center text-sm text-gray-500">UÄitavanje destinacija...</p> : filteredLocations.length ? filteredLocations.map((location) => <Link key={location.id} href={`/locations/${location.slug}`} onClick={() => setIsSearchOpen(false)} className="flex items-center gap-3 border-b border-gray-100 py-3 last:border-0 dark:border-zinc-800">
              <img src={location.cover_image || location.cover_url || location.image || 'https://placeholder.co/160x100'} alt="" className="h-14 w-20 shrink-0 rounded-xl object-cover" />
              <span className="min-w-0"><span className="block truncate text-sm font-semibold text-zinc-900 dark:text-white">{location.title}</span><span className="mt-1 block truncate text-xs text-gray-500 dark:text-zinc-400">{[location.region, location.country].filter(Boolean).join(', ')}</span></span>
            </Link>) : <p className="py-8 text-center text-sm text-gray-500">Nema rezultata za unetu pretragu.</p>}
          </div>
        </section>
      </div>}



    </div>
  );
}
