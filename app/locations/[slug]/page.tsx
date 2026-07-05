'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '../../../src/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Calendar, Compass, ShieldCheck, Info, Sparkles, Pencil, Home, Search, PlusCircle, Heart, User } from 'lucide-react';

export default function LocationDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  // Otpakivanje params-a u Next.js 15+ okruženju
  const resolvedParams = use(params);
  const router = useRouter();
  
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string>('');
  const [role, setRole] = useState<string>('user');
  const [geocodedPosition, setGeocodedPosition] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    async function checkUserRole() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role) setRole(profile.role);
    }

    async function fetchLocationDetails() {
      setLoading(true);
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('slug', resolvedParams.slug)
        .single();

      if (!error && data) {
        setLocation(data);
        setActiveImage(data.cover_image); // Glavna slika je podrazumevano prva velika slika
      } else {
        console.error("Lokacija nije pronađena ili je došlo do greške:", error);
      }
      setLoading(false);
    }

    checkUserRole();
    fetchLocationDetails();
  }, [resolvedParams.slug]);

  useEffect(() => {
    if (!location) return;

    const latitude = Number(location.latitude ?? location.lat);
    const longitude = Number(location.longitude ?? location.lng ?? location.lon);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) return;

    const searchQuery = [location.title, location.region, location.country]
      .filter(Boolean)
      .join(', ');

    if (!searchQuery) return;

    const controller = new AbortController();

    async function geocodeLocation() {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(searchQuery)}`,
          { signal: controller.signal }
        );

        if (!response.ok) return;

        const results = await response.json();
        const firstResult = results?.[0];
        const nextLat = Number(firstResult?.lat);
        const nextLon = Number(firstResult?.lon);

        if (Number.isFinite(nextLat) && Number.isFinite(nextLon)) {
          setGeocodedPosition({ lat: nextLat, lon: nextLon });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Geocoding greška:', error);
        }
      }
    }

    geocodeLocation();

    return () => controller.abort();
  }, [location]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center">
        <p className="text-sm font-medium text-gray-400 animate-pulse">Učitavanje detalja o destinaciji...</p>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="max-w-xl mx-auto min-h-screen bg-white dark:bg-zinc-950 px-6 py-12 text-center space-y-4">
        <p className="text-gray-500">Ups! Tražena lokacija ne postoji u nomadskoj bazi.</p>
        <Link href="/" className="inline-block px-4 py-2 bg-[#006D44] text-white text-xs font-bold rounded-xl">
          Vrati se na početnu
        </Link>
      </div>
    );
  }

  // Spajanje cover_image i niza iz galerije (images) u jednu listu svih slika za pregled
  const allImages = [location.cover_image, ...(location.images || [])].filter(Boolean);
  const storedLatitude = Number(location.latitude ?? location.lat);
  const storedLongitude = Number(location.longitude ?? location.lng ?? location.lon);
  const hasStoredCoordinates = Number.isFinite(storedLatitude) && Number.isFinite(storedLongitude);
  const mapLatitude = hasStoredCoordinates ? storedLatitude : geocodedPosition?.lat;
  const mapLongitude = hasStoredCoordinates ? storedLongitude : geocodedPosition?.lon;
  const hasMapPosition = typeof mapLatitude === 'number' && typeof mapLongitude === 'number';
  const mapBoundingBox = hasMapPosition
    ? `${mapLongitude - 0.03}%2C${mapLatitude - 0.02}%2C${mapLongitude + 0.03}%2C${mapLatitude + 0.02}`
    : '';
  const mapEmbedUrl = hasMapPosition
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${mapBoundingBox}&layer=mapnik&marker=${mapLatitude}%2C${mapLongitude}`
    : '';
  const mapLinkUrl = hasMapPosition
    ? `https://www.openstreetmap.org/?mlat=${mapLatitude}&mlon=${mapLongitude}#map=14/${mapLatitude}/${mapLongitude}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent([location.title, location.region, location.country].filter(Boolean).join(', '))}`;

  return (
    <div className="max-w-xl mx-auto min-h-screen bg-white dark:bg-zinc-950 pb-24 shadow-sm transition-colors duration-200">
      
      {/* TOP NAVIGATION BAR */}
      <div className="sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md px-6 py-4 border-b border-gray-50 dark:border-zinc-900 z-50 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full transition">
          <ArrowLeft className="w-5 h-5 text-zinc-800 dark:text-white" />
        </button>
        <span className="flex-1 text-sm font-black text-zinc-900 dark:text-white tracking-tight uppercase line-clamp-1">
          {location.title}
        </span>
        {role === 'admin' && (
          <Link
            href={`/admin/locations/${location.slug}/edit`}
            className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-[#006D44] dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-900/60 hover:bg-emerald-100/70 transition"
            aria-label={`Izmeni lokaciju ${location.title}`}
          >
            <Pencil className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* VELIKI PREGLED SLIKE (VELIKA FOTOGRAFIJA) */}
      <div className="px-4 mt-4">
        <div className="relative h-64 md:h-72 w-full bg-zinc-100 dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-sm">
          <img 
            src={activeImage || "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80"} 
            alt={location.title} 
            className="w-full h-full object-cover transition-all duration-300"
          />
          {location.difficulty && (
            <span className={`absolute top-4 right-4 text-[10px] font-bold uppercase px-3 py-1.5 rounded-full shadow-md text-white ${
              location.difficulty === 'Lako' ? 'bg-emerald-600' : location.difficulty === 'Srednje' ? 'bg-amber-600' : 'bg-red-600'
            }`}>
              Staza: {location.difficulty}
            </span>
          )}
        </div>

        {/* 📸 MINI GALERIJA (Horizontalni slider za odabir slika) */}
        {allImages.length > 1 && (
          <div className="flex gap-2.5 mt-3 overflow-x-auto pb-2 scrollbar-none px-1">
            {allImages.map((imgUrl, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(imgUrl)}
                className={`relative h-16 w-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition ${
                  activeImage === imgUrl ? 'border-[#006D44] scale-95 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={imgUrl} alt={`Galerija ${idx}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SADRŽAJ I PODACI O LOKACIJI */}
      <div className="px-6 mt-6 space-y-6">
        
        {/* NASLOV I LOKACIJA */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-xs text-[#006D44] dark:text-emerald-400 font-bold uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5" />
            <span>{location.region ? `${location.region}, ` : ''}{location.country}</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-tight">
            {location.title}
          </h1>
          {location.short_description && (
            <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed font-medium italic border-l-2 border-emerald-500 pl-3 py-0.5">
              "{location.short_description}"
            </p>
          )}
        </div>

        {/* BRZE INFORMACIJE (IKONICE) */}
        <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-zinc-900/40 p-4 rounded-2xl border border-gray-100 dark:border-zinc-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <Calendar className="w-4 h-4 text-[#006D44]" />
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-gray-400">Najbolje vreme</span>
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{location.best_time || 'Tokom cele godine'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <Compass className="w-4 h-4 text-[#006D44]" />
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-gray-400">Tip / Kategorija</span>
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 capitalize">#{location.category_id}</span>
            </div>
          </div>
        </div>

        {/* DETALJAN OPIS RUTE / TEKST */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 tracking-wider uppercase flex items-center gap-1.5">
            <Info className="w-4 h-4 text-[#006D44]" /> Detaljan opis avanture
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap font-medium">
            {location.description || 'Za ovu lokaciju još uvek nije dodat detaljan tehnički opis rute. Možete istražiti osnovne parametre ili posetiti lokalitet uz standardne outdoor mere predostrožnosti.'}
          </p>
        </div>

        {/* KARAKTERISTIKE DESTINACIJE (TAGOVI / BADGES) */}
        <div className="pt-4 border-t border-gray-50 dark:border-zinc-900/60 space-y-3">
          <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 tracking-wider uppercase flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#006D44]" /> Sadržaji i Logistika
          </h3>
          
          <div className="flex flex-wrap gap-2">
            <div className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
              location.child_friendly 
                ? 'bg-blue-50/60 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100/50 dark:border-blue-900/40' 
                : 'bg-gray-50 dark:bg-zinc-900 text-gray-400 line-through border-transparent'
            }`}>
              👶 Prilagođeno deci
            </div>
            
            <div className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
              location.pet_allowed 
                ? 'bg-purple-50/60 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-100/50 dark:border-purple-900/40' 
                : 'bg-gray-50 dark:bg-zinc-900 text-gray-400 line-through border-transparent'
            }`}>
              🐾 Pet Friendly
            </div>

            <div className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
              location.parking_available 
                ? 'bg-amber-50/60 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100/50 dark:border-amber-900/40' 
                : 'bg-gray-50 dark:bg-zinc-900 text-gray-400 line-through border-transparent'
            }`}>
              🚗 Dostupan Parking
            </div>
          </div>
        </div>

        {/* MAPA LOKACIJE */}
        <div className="pt-4 border-t border-gray-50 dark:border-zinc-900/60 space-y-3">
          <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 tracking-wider uppercase flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#006D44]" /> Lokacija na mapi
          </h3>
          <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-zinc-900 bg-gray-50 dark:bg-zinc-900/40">
            {hasMapPosition ? (
              <iframe
                title={`Mapa lokacije ${location.title}`}
                src={mapEmbedUrl}
                className="h-72 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="h-40 flex items-center justify-center px-6 text-center">
                <p className="text-xs font-medium text-gray-400">
                  Mapa će se prikazati kada se dodaju GPS koordinate za ovu destinaciju.
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-medium text-gray-400">
              {hasStoredCoordinates ? 'GPS koordinate iz baze' : 'Lokacija pronađena preko OpenStreetMap pretrage'}
            </span>
            <a
              href={mapLinkUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-bold text-[#006D44] dark:text-emerald-400 uppercase"
            >
              Otvori veću mapu
            </a>
          </div>
        </div>

      </div>

      {/* FIKSNI DONJI MENI */}
      <div className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-gray-100 dark:border-zinc-800 px-6 py-3 flex justify-between items-center z-50">
        <Link href="/" className="flex flex-col items-center gap-1 text-[#006D44] dark:text-emerald-500">
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-bold">Početna</span>
        </Link>
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
        <button className="flex flex-col items-center gap-1 text-gray-400">
          <Heart className="w-5 h-5" />
          <span className="text-[10px] font-medium">Omiljeno</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400">
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium">Profil</span>
        </button>
      </div>
    </div>
  );
}
