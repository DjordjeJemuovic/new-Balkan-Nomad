'use client';

import { use, useEffect, useState } from 'react';
import { supabase } from '../../../src/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, Clock3, Compass, Heart, MapPin, Mountain, Pencil, Route, ShieldAlert, ParkingCircle, PawPrint, Baby, Utensils, BedDouble, Trees, ChevronRight, Navigation, Plus, Check } from 'lucide-react';

type ExploreCard = { title: string; subtitle?: string; image?: string; kind?: string; price?: string; distance?: string; difficulty?: string };

function getCards(value: unknown): ExploreCard[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ExploreCard => !!item && typeof item === 'object' && typeof (item as ExploreCard).title === 'string');
}

export default function LocationDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('user');
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  const [mapFilter, setMapFilter] = useState('Sve');
  const [activeTab, setActiveTab] = useState('overview');
  const [geocodedPosition, setGeocodedPosition] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    setSaved(window.localStorage.getItem(`balkan-nomad:saved:${slug}`) === 'true');
  }, [slug]);

  useEffect(() => {
    const sections = ['overview', 'activities', 'nature', 'stay', 'practical']
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveTab(visible.target.id);
    }, { rootMargin: '-150px 0px -58% 0px', threshold: [0, 0.15, 0.4] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [location]);

  const toggleSaved = () => {
    setSaved((current) => {
      const next = !current;
      window.localStorage.setItem(`balkan-nomad:saved:${slug}`, String(next));
      return next;
    });
  };

  useEffect(() => {
    async function load() {
      const [{ data: { session } }, { data, error }] = await Promise.all([
        supabase.auth.getSession(),
        supabase.from('locations').select('*').eq('slug', slug).single(),
      ]);
      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        if (profile?.role) setRole(profile.role);
      }
      if (!error && data) setLocation(data);
      setLoading(false);
    }
    load();
  }, [slug]);

  useEffect(() => {
    if (!location) return;
    const lat = Number(location.latitude ?? location.lat);
    const lon = Number(location.longitude ?? location.lng ?? location.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) return;
    const query = [location.title, location.region, location.country].filter(Boolean).join(', ');
    const controller = new AbortController();
    fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : [])
      .then((results) => {
        const nextLat = Number(results?.[0]?.lat), nextLon = Number(results?.[0]?.lon);
        if (Number.isFinite(nextLat) && Number.isFinite(nextLon)) setGeocodedPosition({ lat: nextLat, lon: nextLon });
      }).catch(() => undefined);
    return () => controller.abort();
  }, [location]);

  if (loading) return <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center bg-[#101310] text-sm text-zinc-400">Učitavanje destinacije…</main>;
  if (!location) return <main className="mx-auto min-h-screen max-w-3xl bg-[#101310] px-6 py-16 text-center text-zinc-300"><p>Ova lokacija nije pronađena.</p><Link href="/" className="mt-5 inline-block rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">Nazad na destinacije</Link></main>;

  const images = [...new Set([location.cover_image, ...(Array.isArray(location.images) ? location.images : [])].filter((image): image is string => typeof image === 'string' && !!image))].slice(0, 6);
  const lat = Number(location.latitude ?? location.lat), lon = Number(location.longitude ?? location.lng ?? location.lon);
  const mapLat = Number.isFinite(lat) ? lat : geocodedPosition?.lat;
  const mapLon = Number.isFinite(lon) ? lon : geocodedPosition?.lon;
  const hasMap = typeof mapLat === 'number' && typeof mapLon === 'number';
  const mapSrc = hasMap ? `https://www.openstreetmap.org/export/embed.html?bbox=${mapLon! - 0.03}%2C${mapLat! - 0.02}%2C${mapLon! + 0.03}%2C${mapLat! + 0.02}&layer=mapnik&marker=${mapLat}%2C${mapLon}` : '';
  const mapLink = hasMap ? `https://www.openstreetmap.org/?mlat=${mapLat}&mlon=${mapLon}#map=14/${mapLat}/${mapLon}` : `https://www.openstreetmap.org/search?query=${encodeURIComponent([location.title, location.region, location.country].filter(Boolean).join(', '))}`;
  const activities = getCards(location.activities);
  const nature = getCards(location.attractions ?? location.sights);
  const stays = getCards(location.accommodations ?? location.stays);
  const food = getCards(location.food ?? location.restaurants);
  const description = location.description || 'Detaljan opis ove destinacije još nije dodat.';
  const shortDescription = location.short_description || description;
  const difficultyClass = location.difficulty ? 'bg-orange-500 text-white' : 'bg-white/15 text-white';

  const section = (id: string, title: string, icon: React.ReactNode, cards: ExploreCard[], tone: string, emptyText: string) => {
    const visible = showAll[id] ? cards : cards.slice(0, 4);
    return <section id={id} key={id} className="scroll-mt-32 px-5 py-7 md:px-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">{icon}{title}</h2>
        {cards.length > 4 && <button onClick={() => setShowAll({ ...showAll, [id]: !showAll[id] })} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-400">{showAll[id] ? 'Manje' : 'Vidi sve'} <ChevronRight className="h-4 w-4" /></button>}
      </div>
      {cards.length ? <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:px-0">{visible.map((card, index) => <article key={`${card.title}-${index}`} className="w-64 shrink-0 snap-start overflow-hidden rounded-2xl border border-white/[0.07] bg-[#1b201c]">
        {card.image ? <img src={card.image} alt={card.title} className="h-36 w-full object-cover" /> : <div className={`flex h-28 items-center justify-center ${tone}`}><span className="rounded-full bg-black/10 p-3">{icon}</span></div>}
        <div className="p-4"><h3 className="font-semibold text-zinc-100">{card.title}</h3>{card.subtitle && <p className="mt-1 text-sm text-zinc-400">{card.subtitle}</p>}<div className="mt-3 flex flex-wrap gap-2">{[card.kind, card.difficulty, card.price, card.distance].filter(Boolean).map((label) => <span key={label} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-zinc-300">{label}</span>)}</div></div>
      </article>)}</div> : <div className="rounded-2xl border border-dashed border-white/10 bg-[#171b18] px-4 py-5 text-sm text-zinc-500">{emptyText}</div>}
    </section>;
  };

  return <main className="mx-auto min-h-screen max-w-3xl bg-[#101310] pb-28 text-zinc-100 shadow-2xl">
    <header className="absolute z-20 flex w-full max-w-3xl items-center justify-between px-5 py-4">
      <button onClick={() => router.back()} aria-label="Nazad" className="rounded-full border border-white/15 bg-black/35 p-2.5 text-white backdrop-blur-md"><ArrowLeft className="h-5 w-5" /></button>
      <div className="flex gap-2">
        <button onClick={toggleSaved} aria-label={saved ? 'Ukloni iz sačuvanih' : 'Sačuvaj lokaciju'} className={`rounded-full border border-white/15 p-2.5 backdrop-blur-md ${saved ? 'bg-rose-500 text-white' : 'bg-black/35 text-white'}`}><Heart className={`h-5 w-5 ${saved ? 'fill-current' : ''}`} /></button>
        {role === 'admin' && <Link href={`/admin/locations/${location.slug}/edit`} aria-label="Izmeni lokaciju" className="rounded-full border border-white/15 bg-black/35 p-2.5 text-white backdrop-blur-md"><Pencil className="h-5 w-5" /></Link>}
      </div>
    </header>

    <section className="relative">
      {images.length ? <div className="flex snap-x snap-mandatory overflow-x-auto">
        {images.map((image, index) => <div key={image} className="relative h-[340px] w-full shrink-0 snap-center md:h-[430px]"><img src={image} alt={`${location.title}, fotografija ${index + 1}`} className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#101310] via-black/10 to-black/25" /></div>)}
      </div> : <div className="h-[340px] bg-gradient-to-br from-emerald-950 via-zinc-800 to-zinc-950 md:h-[430px]" />}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#101310] to-transparent" />
      {images.length > 1 && <span className="absolute bottom-28 right-5 rounded-full bg-black/45 px-3 py-1 text-xs text-white backdrop-blur">Prevuci fotografije · {images.length}</span>}
      <div className="absolute inset-x-0 bottom-0 px-5 pb-5 md:px-8">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-emerald-300"><MapPin className="h-4 w-4" />{[location.region, location.country].filter(Boolean).join(', ')}</div>
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{location.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${difficultyClass}`}>{location.difficulty || 'Destinacija'}</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white">{location.category_id}</span></div>
      </div>
    </section>

    <div className="grid grid-cols-2 gap-px border-y border-white/[0.06] bg-white/[0.06] md:grid-cols-4">
      {[[CalendarDays, 'Najbolje vreme', location.best_time || 'Tokom cele godine'], [Mountain, 'Težina', location.difficulty || 'Za svakoga'], [Clock3, 'Trajanje', location.duration || 'Nije navedeno'], [Route, 'Nadmorska visina', location.elevation ? `${location.elevation} m` : 'Nije navedena']].map(([Icon, label, value]: any) => <div key={label} className="flex min-h-[76px] items-center gap-3 bg-[#151915] px-4 py-3"><Icon className="h-5 w-5 shrink-0 text-emerald-400" /><div className="min-w-0"><p className="text-[11px] text-zinc-500">{label}</p><p className="truncate text-sm font-medium text-zinc-200">{value}</p></div></div>)}
    </div>

    <nav aria-label="Sadržaj lokacije" className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#101310]/95 px-5 backdrop-blur-xl md:px-8"><div className="flex gap-5 overflow-x-auto py-3 text-sm font-medium text-zinc-400">{[['overview','Pregled'],['activities','Aktivnosti'],['nature','Priroda'],['stay','Hrana i smeštaj'],['practical','Praktično']].map(([id, label]) => <a key={id} href={`#${id}`} aria-current={activeTab === id ? 'location' : undefined} onClick={() => setActiveTab(id)} className={`relative shrink-0 py-1 transition ${activeTab === id ? 'font-semibold text-emerald-300 after:absolute after:inset-x-0 after:-bottom-3 after:h-0.5 after:rounded-full after:bg-emerald-400' : 'hover:text-emerald-200'}`}>{label}</a>)}</div></nav>

    <section id="overview" className="scroll-mt-32 px-5 py-7 md:px-8">
      <h2 className="mb-3 text-lg font-semibold text-white">O destinaciji</h2>
      <p className={`whitespace-pre-wrap text-sm leading-6 text-zinc-400 ${expanded ? '' : 'line-clamp-3'}`}>{shortDescription}</p>
      {(description !== shortDescription || shortDescription.length > 160) && <button onClick={() => setExpanded(!expanded)} className="mt-2 text-sm font-semibold text-emerald-400">{expanded ? 'Prikaži manje' : 'Pročitaj više'}</button>}
      {expanded && description !== shortDescription && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-400">{description}</p>}
    </section>

    {section('activities', 'Aktivnosti', <Compass className="h-5 w-5 text-violet-300" />, activities, 'bg-violet-400/10 text-violet-300', 'Aktivnosti za ovu lokaciju još nisu dodate.')}
    {section('nature', 'Priroda i znamenitosti', <Trees className="h-5 w-5 text-emerald-300" />, nature, 'bg-emerald-400/10 text-emerald-300', 'Znamenitosti u blizini još nisu dodate.')}
    {section('stay', 'Hrana i smeštaj', <BedDouble className="h-5 w-5 text-sky-300" />, [...stays, ...food], 'bg-sky-400/10 text-sky-300', 'Preporuke za hranu i smeštaj još nisu dodate.')}

    <section id="practical" className="scroll-mt-32 px-5 py-7 md:px-8">
      <h2 className="mb-4 text-lg font-semibold text-white">Praktične informacije</h2>
      {location.warning && <div className="mb-4 flex gap-3 rounded-2xl border border-orange-400/20 bg-orange-400/10 p-4 text-orange-100"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" /><div><p className="text-sm font-semibold">Važno za bezbednost</p><p className="mt-1 text-sm leading-5 text-orange-100/75">{location.warning}</p></div></div>}
      <div className="mb-5 flex flex-wrap gap-2">{[[Baby,'Deca',location.child_friendly], [PawPrint,'Ljubimci',location.pet_allowed], [ParkingCircle,'Parking',location.parking_available]].map(([Icon, label, yes]: any) => <span key={label} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${yes ? 'border-sky-400/20 bg-sky-400/10 text-sky-200' : 'border-white/[0.06] bg-white/[0.03] text-zinc-600'}`}><Icon className="h-3.5 w-3.5" />{label}{yes && <Check className="h-3 w-3" />}</span>)}</div>
      <div className="mb-3 flex items-center justify-between"><h3 className="font-medium text-zinc-200">Mapa</h3><div className="flex gap-1 rounded-full bg-white/[0.05] p-1">{['Sve','Aktivnosti','Smeštaj'].map((filter) => <button key={filter} onClick={() => setMapFilter(filter)} className={`rounded-full px-3 py-1 text-xs ${filter === mapFilter ? 'bg-emerald-700 text-white' : 'text-zinc-400'}`}>{filter}</button>)}</div></div>
      <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#1b201c]">{hasMap ? <iframe title={`Mapa lokacije ${location.title}`} src={mapSrc} className="h-64 w-full border-0 grayscale-[0.25]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div className="flex h-40 items-center justify-center px-6 text-center text-sm text-zinc-500">Mapa će biti dostupna kada budu pronađene koordinate.</div>}</div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500"><Utensils className="h-3.5 w-3.5" />{mapFilter === 'Sve' ? 'Prikaz lokacije' : `Filter: ${mapFilter} · dodatni pinovi će se prikazati kada budu dostupni`}</p>
      <a href={mapLink} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400">Otvori navigaciju <Navigation className="h-4 w-4" /></a>
    </section>

    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-3xl gap-3 border-t border-white/[0.08] bg-[#151915]/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:px-8">
      <button onClick={toggleSaved} className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${saved ? 'border-emerald-500 bg-emerald-950 text-emerald-300' : 'border-white/10 bg-white/[0.04] text-zinc-100'}`}><Heart className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />{saved ? 'Sačuvano' : 'Sačuvaj'}</button>
      <a href={mapLink} target="_blank" rel="noreferrer" className="flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600"><Plus className="h-4 w-4" />Navigacija</a>
    </div>
  </main>;
}
