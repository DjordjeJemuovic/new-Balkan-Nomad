'use client';

import { use, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../../../src/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, Clock3, Compass, Heart, MapPin, Mountain, Pencil, Route, ShieldAlert, ParkingCircle, PawPrint, Baby, Utensils, BedDouble, Trees, Plus, Check } from 'lucide-react';

type ExploreCard = { title: string; description?: string; subtitle?: string; image?: string; kind?: string; price?: string; distance?: string; difficulty?: string; season?: string };
type ExploreTab = { id: string; label: string; icon: ReactNode; cards: ExploreCard[] };

function getCards(value: unknown): ExploreCard[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ExploreCard => !!item && typeof item === 'object' && typeof (item as ExploreCard).title === 'string');
}

function groupActivityDescriptions(cards: ExploreCard[]) {
  return cards.reduce<ExploreCard[]>((grouped, card) => {
    const previous = grouped[grouped.length - 1];
    if (!card.description && card.title.length > 80 && previous && !previous.description) {
      grouped[grouped.length - 1] = { ...previous, description: card.title };
    } else {
      grouped.push(card);
    }
    return grouped;
  }, []);
}

export default function LocationDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [location, setLocation] = useState<any>(null);
  const [locationItems, setLocationItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('user');
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeExploreTab, setActiveExploreTab] = useState('activities');

  useEffect(() => {
    setSaved(window.localStorage.getItem(`balkan-nomad:saved:${slug}`) === 'true');
  }, [slug]);

  useEffect(() => {
    const sections = ['overview', 'explore', 'practical']
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
      if (!error && data) {
        setLocation(data);
        const { data: items, error: itemsError } = await supabase
          .from('location_items')
          .select('*')
          .eq('location_id', data.id)
          .order('sort_order');
        if (!itemsError && items) setLocationItems(items);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) return <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center bg-[#101310] text-sm text-zinc-400">Učitavanje destinacije…</main>;
  if (!location) return <main className="mx-auto min-h-screen max-w-3xl bg-[#101310] px-6 py-16 text-center text-zinc-300"><p>Ova lokacija nije pronađena.</p><Link href="/" className="mt-5 inline-block rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">Nazad na destinacije</Link></main>;

  const images = [...new Set([location.cover_image, ...(Array.isArray(location.images) ? location.images : [])].filter((image): image is string => typeof image === 'string' && !!image))].slice(0, 6);
  const activities = groupActivityDescriptions(locationItems.length
    ? locationItems.filter((item) => item.type === 'activity').map((item) => ({ title: item.title, description: item.description, season: Array.isArray(item.season) ? item.season.join(' · ') : undefined, difficulty: item.difficulty }))
    : getCards(location.activities));
  const nature = locationItems.length
    ? locationItems.filter((item) => item.type === 'attraction').map((item) => ({ title: item.title, image: item.image_url, description: item.description }))
    : getCards(location.attractions ?? location.sights);
  const venueItems = locationItems.filter((item) => item.type === 'venue');
  const getVenueDescription = (item: any) => typeof item.description === 'string' ? item.description.replace(/^\[[^\]]+\]\s*/, '') : undefined;
  const stays = venueItems.length
    ? venueItems.filter((item) => item.subtype === 'accommodation' || (typeof item.description === 'string' && item.description.startsWith('[') && !item.description.startsWith('[hrana]'))).map((item) => ({ title: item.title, description: getVenueDescription(item), kind: item.subtype === 'accommodation' ? undefined : item.subtype, distance: item.distance_km == null ? undefined : `${item.distance_km} km` }))
    : getCards(location.accommodations ?? location.stays);
  const food = venueItems.length
    ? venueItems.filter((item) => item.subtype === 'food' || (typeof item.description === 'string' && item.description.startsWith('[hrana]'))).map((item) => ({ title: item.title, description: getVenueDescription(item), kind: item.subtype === 'food' ? undefined : item.subtype, distance: item.distance_km == null ? undefined : `${item.distance_km} km` }))
    : getCards(location.food ?? location.restaurants);
  const description = location.description || 'Detaljan opis ove destinacije još nije dodat.';
  const shortDescription = location.short_description || description;
  const difficultyClass = location.difficulty ? 'bg-orange-500 text-white' : 'bg-white/15 text-white';

  const exploreTabs: ExploreTab[] = [
    { id: 'activities', label: 'Aktivnosti', icon: <Compass className="h-4 w-4" />, cards: activities },
    { id: 'nature', label: 'Prirodene lepote', icon: <Trees className="h-4 w-4" />, cards: nature },
    { id: 'stay', label: 'Smeštaj', icon: <BedDouble className="h-4 w-4" />, cards: stays },
    { id: 'food', label: 'Hrana i piće', icon: <Utensils className="h-4 w-4" />, cards: food },
  ];
  const selectedExploreTab = exploreTabs.find((tab) => tab.id === activeExploreTab) ?? exploreTabs[0];

  return <main className="mx-auto min-h-screen w-full max-w-3xl min-w-0 bg-[#101310] pb-28 text-zinc-100 shadow-2xl">
    <header className="absolute z-20 flex w-full max-w-3xl items-center justify-between px-4 py-4 sm:px-5">
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
        <h1 className="break-words text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">{location.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${difficultyClass}`}>{location.difficulty || 'Destinacija'}</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white">{location.category_id}</span></div>
      </div>
    </section>

    <div className="grid grid-cols-2 gap-px border-y border-white/[0.06] bg-white/[0.06] sm:grid-cols-4">
      {[[CalendarDays, 'Najbolje vreme', location.best_time || 'Tokom cele godine'], [Mountain, 'Težina', location.difficulty || 'Za svakoga'], [Clock3, 'Trajanje', location.duration_text || location.duration || 'Nije navedeno'], [Route, 'Nadmorska visina', (location.elevation_m ?? location.elevation) ? `${location.elevation_m ?? location.elevation} m` : 'Nije navedena']].map(([Icon, label, value]: any) => <div key={label} className="flex min-h-[76px] items-center gap-3 bg-[#151915] px-4 py-3"><Icon className="h-5 w-5 shrink-0 text-emerald-400" /><div className="min-w-0"><p className="text-[11px] text-zinc-500">{label}</p><p className="truncate text-sm font-medium text-zinc-200">{value}</p></div></div>)}
    </div>

    <nav aria-label="Sadržaj lokacije" className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#101310]/95 px-5 backdrop-blur-xl md:px-8"><div className="flex gap-5 overflow-x-auto py-3 text-sm font-medium text-zinc-400">{[['overview','Pregled'],['explore','Istraži'],['practical','Praktično']].map(([id, label]) => <a key={id} href={`#${id}`} aria-current={activeTab === id ? 'location' : undefined} onClick={() => setActiveTab(id)} className={`relative shrink-0 py-1 transition ${activeTab === id ? 'font-semibold text-emerald-300 after:absolute after:inset-x-0 after:-bottom-3 after:h-0.5 after:rounded-full after:bg-emerald-400' : 'hover:text-emerald-200'}`}>{label}</a>)}</div></nav>

    <section id="overview" className="scroll-mt-32 px-5 py-7 md:px-8">
      <h2 className="mb-3 text-lg font-semibold text-white">O destinaciji</h2>
      <p className={`whitespace-pre-wrap text-sm leading-6 text-zinc-400 ${expanded ? '' : 'line-clamp-3'}`}>{shortDescription}</p>
      {(description !== shortDescription || shortDescription.length > 160) && <button onClick={() => setExpanded(!expanded)} className="mt-2 text-sm font-semibold text-emerald-400">{expanded ? 'Prikaži manje' : 'Pročitaj više'}</button>}
      {expanded && description !== shortDescription && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-400">{description}</p>}
    </section>

    <section id="explore" className="scroll-mt-16 px-5 py-7 md:px-8">
      <h2 className="mb-4 text-lg font-semibold text-white">Šta možeš da radiš i posetiš</h2>
      <div role="tablist" aria-label="Kategorije lokacije" className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#171b18] p-2">
        {exploreTabs.map((tab) => <button key={tab.id} id={`tab-${tab.id}`} type="button" role="tab" aria-selected={activeExploreTab === tab.id} aria-controls="explore-panel" onClick={() => setActiveExploreTab(tab.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${activeExploreTab === tab.id ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-950/40' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'}`}>{tab.icon}{tab.label}<span className={`rounded-full px-2 py-0.5 text-xs ${activeExploreTab === tab.id ? 'bg-white/15 text-white' : 'bg-white/[0.06] text-zinc-400'}`}>{tab.cards.length}</span></button>)}
      </div>
      <div id="explore-panel" role="tabpanel" aria-labelledby={`tab-${selectedExploreTab.id}`} className="min-h-48">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-400">{selectedExploreTab.icon}<span>{selectedExploreTab.label}</span></div>
        {selectedExploreTab.cards.length ? <div className="divide-y divide-white/[0.08]">{selectedExploreTab.cards.map((card, index) => <article key={`${card.title}-${index}`} className="py-6 first:pt-1 last:pb-1">
          {card.image && <img src={card.image} alt={card.title} className="mb-5 max-h-72 w-full rounded-2xl object-cover" />}
          <h3 className="break-words text-lg font-semibold tracking-tight text-white sm:text-xl">{card.title}</h3>
          {card.description && <p className="mt-3 break-words whitespace-pre-wrap text-[15px] leading-7 text-zinc-300">{card.description}</p>}
          {!card.description && card.subtitle && <p className="mt-3 break-words whitespace-pre-wrap text-[15px] leading-7 text-zinc-300">{card.subtitle}</p>}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-emerald-300">{[card.kind, card.season, card.difficulty, card.price, card.distance].filter(Boolean).map((label) => <span key={label}>{label}</span>)}</div>
        </article>)}</div> : <div className="py-8 text-sm text-zinc-500">Ova kategorija još nema unetih stavki.</div>}
      </div>
    </section>

    <section id="practical" className="scroll-mt-32 px-5 py-7 md:px-8">
      <h2 className="mb-4 text-lg font-semibold text-white">Praktične informacije</h2>
      {(Array.isArray(location.warnings) ? location.warnings : location.warning ? [location.warning] : []).map((warning: string, index: number) => <div key={`${warning}-${index}`} className="mb-4 flex gap-3 rounded-2xl border border-orange-400/20 bg-orange-400/10 p-4 text-orange-100"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" /><div><p className="text-sm font-semibold">Važno za bezbednost</p><p className="mt-1 text-sm leading-5 text-orange-100/75">{warning}</p></div></div>)}
      <div className="mb-5 flex flex-wrap gap-2">{[[Baby,'Deca',location.child_friendly], [PawPrint,'Ljubimci',location.pet_allowed], [ParkingCircle,'Parking',location.parking_available]].map(([Icon, label, yes]: any) => <span key={label} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${yes ? 'border-sky-400/20 bg-sky-400/10 text-sky-200' : 'border-white/[0.06] bg-white/[0.03] text-zinc-600'}`}><Icon className="h-3.5 w-3.5" />{label}{yes && <Check className="h-3 w-3" />}</span>)}</div>
    </section>

    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-3xl gap-3 border-t border-white/[0.08] bg-[#151915]/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:px-8">
      <button onClick={toggleSaved} className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${saved ? 'border-emerald-500 bg-emerald-950 text-emerald-300' : 'border-white/10 bg-white/[0.04] text-zinc-100'}`}><Heart className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />{saved ? 'Sačuvano' : 'Sačuvaj'}</button>
    </div>
  </main>;
}
