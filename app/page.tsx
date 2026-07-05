'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../src/lib/supabase';
import Link from 'next/link';
import { Home, Search, Heart, User, PlusCircle, MapPin, Compass, Trash2, Loader2, Globe, Pencil } from 'lucide-react';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>('user');
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Stanja za napredno filtriranje na klijentu
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('Sve države');

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
      }
      setLoading(false);
    }

    checkUser();
    fetchLocations();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    const confirmDelete = window.confirm(`Da li si siguran da želiš trajno da obrišeš lokaciju: "${title}"?`);
    if (!confirmDelete) return;

    setDeletingId(id);
    const { error } = await supabase.from('locations').delete().eq('id', id);

    if (error) {
      alert(`Greška pri brisanju: ${error.message}`);
    } else {
      setLocations(locations.filter(loc => loc.id !== id));
    }
    setDeletingId(null);
  };

  // Kombinovana pretraga (unos teksta) i filter država (padajući meni)
  const filteredLocations = locations.filter((loc) => {
    const matchesSearch = 
      loc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (loc.region && loc.region.toLowerCase().includes(searchQuery.toLowerCase())) ||
      loc.short_description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCountry = selectedCountry === 'Sve države' || loc.country === selectedCountry;

    return matchesSearch && matchesCountry;
  });

  return (
    <div className="max-w-xl mx-auto min-h-screen bg-white dark:bg-zinc-950 pb-28 shadow-sm transition-colors duration-200">
      
      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 dark:border-zinc-900">
        <span className="text-xl font-black text-[#006D44] tracking-wider">BALKAN NOMAD</span>
        <div className="flex items-center gap-2">
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
            alt="Balkan Wilderness Map" 
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
          <div className="relative z-20 text-white space-y-1">
            <h2 className="text-xl font-black leading-tight tracking-tight">KREĆE BALKANSKA AVANTURA</h2>
            <p className="text-xs text-zinc-300">Sve rute, skriveni kutkovi i divljina na jednom mestu.</p>
          </div>
        </div>

        {/* PRETRAGA I SELEKTOR */}
        <div className="mt-4 space-y-2">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Pretraži naziv, regiju..." 
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
              <option value="Sve države">🌍 Sve države Balkana</option>
              <option value="Srbija">Srbija</option>
              <option value="Crna Gora">Crna Gora</option>
              <option value="Bosna i Hercegovina">Bosna i Hercegovina</option>
              <option value="Hrvatska">Hrvatska</option>
              <option value="Severna Makedonija">Severna Makedonija</option>
              <option value="Albanija">Albanija</option>
              <option value="Slovenija">Slovenija</option>
              <option value="Bugarska">Bugarska</option>
              <option value="Grčka">Grčka</option>
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
            {selectedCountry === 'Sve države' ? 'Preporučene destinacije' : `Destinacije — ${selectedCountry}`}
          </h3>
          <span className="text-xs text-gray-400 font-medium">{filteredLocations.length} nađeno</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400 font-medium animate-pulse">
            Učitavanje destinacija sa servera...
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400 bg-gray-50 dark:bg-zinc-900/40 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 px-6">
            Nema pronađenih lokacija za zadate filtere.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {filteredLocations.map((loc) => {
              // Ispisujemo objekat u konzolu da na licu mesta vidiš šta baza tačno vraća
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
                        aria-label={`Obriši lokaciju ${loc.title}`}
                      >
                        {deletingId === loc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  )}

                  {/* DINAMIČKI LINK */}
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
                        {loc.child_friendly && <span className="text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md">👶 Deca OK</span>}
                        {loc.pet_allowed && <span className="text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-md">🐾 Pet Friendly</span>}
                        {loc.parking_available && <span className="text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md">🚗 Parking</span>}
                      </div>
                    </div>
                  </Link>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FIKSNI DONJI MENI */}
      <div className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-gray-100 dark:border-zinc-800 px-6 py-3 flex justify-between items-center z-50">
        <button className="flex flex-col items-center gap-1 text-[#006D44] dark:text-emerald-500">
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-bold">Početna</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400">
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-medium">Pretraga</span>
        </button>
        {role === 'admin' && (
          <Link href="/admin/locations/new" className="flex flex-col items-center gap-1 text-emerald-600">
            <PlusCircle className="w-5 h-5 text-[#006D44]" />
            <span className="text-[10px] font-bold text-[#006D44]">Dodaj lokaciju</span>
          </Link>
        )}
        <button className="flex flex-col items-center gap-1 text-gray-400"><Heart className="w-5 h-5" /><span className="text-[10px] font-medium">Omiljeno</span></button>
        <button className="flex flex-col items-center gap-1 text-gray-400"><User className="w-5 h-5" /><span className="text-[10px] font-medium">Profil</span></button>
      </div>

    </div>
  );
}
