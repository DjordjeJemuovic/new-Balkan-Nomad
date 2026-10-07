'use client';

import { use, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../../../src/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, Clock3, Compass, Heart, MapPin, Mountain, Pencil, Route, ShieldAlert, ParkingCircle, PawPrint, Baby, Utensils, BedDouble, Trees, Plus, Check, Share2, Copy } from 'lucide-react';
import { loadSavedLocationIds } from '../../../src/lib/saved-locations';

type ExploreCard = { title: string; description?: string; subtitle?: string; image?: string; kind?: string; price?: string; distance?: string; difficulty?: string; season?: string };
type ExploreTab = { id: string; label: string; icon: ReactNode; cards: ExploreCard[]; available?: boolean };

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
  const [savingSaved, setSavingSaved] = useState(false);
  const [favoriteMessage, setFavoriteMessage] = useState('');
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeExploreTab, setActiveExploreTab] = useState('activities');

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

  const toggleSaved = async () => {
    const next = !saved;
    setSavingSaved(true);
    setFavoriteMessage('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && location?.id) {
        const result = next
          ? await supabase.from('user_saved_locations').insert({ user_id: session.user.id, location_id: location.id })
          : await supabase.from('user_saved_locations').delete().eq('user_id', session.user.id).eq('location_id', location.id);
        if (result.error) throw result.error;
      } else {
        window.localStorage.setItem(`balkan-nomad:saved:${slug}`, String(next));
      }
      setSaved(next);
      window.dispatchEvent(new Event('balkan-nomad:favorites-changed'));
    } catch {
      setFavoriteMessage('Destinacija nije sačuvana. Pokušaj ponovo.');
    } finally {
      setSavingSaved(false);
    }
  };

  const shareDestination = (network: string) => {
    const url = window.location.href;
    const title = location.title + ' — Balkan Nomad';
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const shareLinks: Record<string, string> = {
      Facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + encodedUrl,
      WhatsApp: 'https://api.whatsapp.com/send?text=' + encodeURIComponent(title + ' ' + url),
      Telegram: 'https://t.me/share/url?url=' + encodedUrl + '&text=' + encodedTitle,
      X: 'https://twitter.com/intent/tweet?url=' + encodedUrl + '&text=' + encodedTitle,
      LinkedIn: 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodedUrl,
      Viber: 'viber://forward?text=' + encodeURIComponent(title + ' ' + url),
    };
    const link = shareLinks[network];
    if (link) window.open(link, '_blank', 'noopener,noreferrer');
    setShareMenuOpen(false);
  };

  const shareWithDevice = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: location.title, text: 'Pogledaj ovu destinaciju na Balkan Nomad aplikaciji.', url: window.location.href });
        setShareFeedback('');
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') setShareFeedback('Deljenje trenutno nije uspelo.');
      }
    } else {
      setShareFeedback('Deljenje preko uređaja nije podržano u ovom pregledaču.');
    }
    setShareMenuOpen(false);
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareFeedback('Link je kopiran.');
    } catch {
      window.prompt('Kopiraj link destinacije:', window.location.href);
      setShareFeedback('');
    }
    setShareMenuOpen(false);
    window.setTimeout(() => setShareFeedback(''), 2500);
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
        if (session?.user) {
          const savedIds = await loadSavedLocationIds(session.user.id);
          setSaved(savedIds?.has(data.id) ?? window.localStorage.getItem(`balkan-nomad:saved:${slug}`) === 'true');
        } else {
          setSaved(window.localStorage.getItem(`balkan-nomad:saved:${slug}`) === 'true');
        }
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

  if (loading) return null;
  if (!location) return <main className="mx-auto min-h-screen max-w-3xl bg-white dark:bg-[#101310] px-6 py-16 text-center text-zinc-700 dark:text-zinc-300"><p>Ova lokacija nije pronađena.</p><Link href="/" className="mt-5 inline-block rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">Nazad na destinacije</Link></main>;

  const images = [...new Set([location.cover_image, ...(Array.isArray(location.images) ? location.images : [])].filter((image): image is string => typeof image === 'string' && !!image))].slice(0, 6);
  const activities = groupActivityDescriptions(locationItems.length
    ? locationItems.filter((item) => item.type === 'activity').map((item) => ({ title: item.title, image: item.image_url, description: item.description, season: Array.isArray(item.season) ? item.season.join(' · ') : undefined, difficulty: item.difficulty }))
    : getCards(location.activities));
  const nature = locationItems.length
    ? locationItems.filter((item) => item.type === 'attraction').map((item) => ({ title: item.title, image: item.image_url, description: item.description }))
    : getCards(location.attractions ?? location.sights);
  const venueItems = locationItems.filter((item) => item.type === 'venue');
  const getVenueDescription = (item: any) => typeof item.description === 'string' ? item.description.replace(/^\[[^\]]+\]\s*/, '') : undefined;
  const stays = venueItems.length
    ? venueItems.filter((item) => item.subtype === 'accommodation' || (typeof item.description === 'string' && item.description.startsWith('[') && !item.description.startsWith('[hrana]'))).map((item) => ({ title: item.title, image: item.image_url, description: getVenueDescription(item), kind: item.subtype === 'accommodation' ? undefined : item.subtype, distance: item.distance_km == null ? undefined : `${item.distance_km} km` }))
    : getCards(location.accommodations ?? location.stays);
  const food = venueItems.length
    ? venueItems.filter((item) => item.subtype === 'food' || (typeof item.description === 'string' && item.description.startsWith('[hrana]'))).map((item) => ({ title: item.title, image: item.image_url, description: getVenueDescription(item), kind: item.subtype === 'food' ? undefined : item.subtype, distance: item.distance_km == null ? undefined : `${item.distance_km} km` }))
    : getCards(location.food ?? location.restaurants);
  const description = location.description || 'Detaljan opis ove destinacije još nije dodat.';
  const shortDescription = location.short_description || description;
  const difficultyClass = location.difficulty ? 'bg-orange-500 text-white' : 'bg-white/15 text-white';

  const exploreTabs: ExploreTab[] = [
    { id: 'activities', label: 'Aktivnosti', icon: <Compass className="h-4 w-4" />, cards: activities },
    { id: 'nature', label: 'Prirodene lepote', icon: <Trees className="h-4 w-4" />, cards: nature },
    { id: 'stay', label: 'Smeštaj', icon: <BedDouble className="h-4 w-4" />, cards: stays, available: false },
    { id: 'food', label: 'Hrana i piće', icon: <Utensils className="h-4 w-4" />, cards: food, available: false },
  ];
  const selectedExploreTab = exploreTabs.find((tab) => tab.id === activeExploreTab) ?? exploreTabs[0];

  return <main className="mx-auto min-h-screen w-full max-w-3xl min-w-0 bg-white pb-44 text-zinc-900 shadow-2xl dark:bg-[#101310] dark:text-zinc-100 lg:max-w-7xl lg:pb-48">
    <header className="absolute inset-x-0 z-20 mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4 sm:px-5 lg:max-w-7xl lg:px-10 lg:py-7">
      <button onClick={() => router.back()} aria-label="Nazad" className="rounded-full border border-white/15 bg-black/35 p-2.5 text-white backdrop-blur-md"><ArrowLeft className="h-5 w-5" /></button>
      <div className="relative flex gap-2">
        <button type="button" onClick={() => { setShareMenuOpen((open) => !open); setShareFeedback(''); }} aria-label="Podeli destinaciju" aria-expanded={shareMenuOpen} className="rounded-full border border-white/15 bg-black/35 p-2.5 text-white backdrop-blur-md"><Share2 className="h-5 w-5" /></button>
        {shareMenuOpen && <div role="menu" aria-label="Podeli destinaciju" className="absolute right-0 top-14 z-50 w-56 overflow-hidden rounded-2xl border border-white/10 bg-white p-2 text-zinc-900 shadow-xl dark:bg-zinc-900 dark:text-white">
          <button type="button" role="menuitem" onClick={() => void shareWithDevice()} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-gray-100 dark:hover:bg-zinc-800">Podeli preko uređaja</button>
          {['WhatsApp', 'Facebook', 'Telegram', 'X', 'Viber', 'LinkedIn'].map((network) => <button key={network} type="button" role="menuitem" onClick={() => shareDestination(network)} className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-zinc-800">{network}</button>)}
          <div className="my-1 border-t border-gray-200 dark:border-zinc-700" />
          <button type="button" role="menuitem" onClick={() => void copyShareLink()} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"><Copy className="h-4 w-4" />Kopiraj link</button>
        </div>}
        <button onClick={toggleSaved} aria-label={saved ? 'Ukloni iz sačuvanih' : 'Sačuvaj lokaciju'} className={`rounded-full border border-white/15 p-2.5 backdrop-blur-md ${saved ? 'bg-rose-500 text-white' : 'bg-black/35 text-white'}`}><Heart className={`h-5 w-5 ${saved ? 'fill-current' : ''}`} /></button>
        {role === 'admin' && <Link href={`/admin/locations/${location.slug}/edit`} aria-label="Izmeni lokaciju" className="rounded-full border border-white/15 bg-black/35 p-2.5 text-white backdrop-blur-md"><Pencil className="h-5 w-5" /></Link>}
      </div>
    </header>
    {shareFeedback && <div role="status" className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-lg">{shareFeedback}</div>}

    <section className="relative">
      {images.length ? <div className="flex snap-x snap-mandatory overflow-x-auto">
        {images.map((image, index) => <div key={image} className="relative h-[340px] w-full shrink-0 snap-center md:h-[430px] lg:h-[540px]"><img src={image} alt={`${location.title}, fotografija ${index + 1}`} className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#101310] via-black/10 to-black/25" /></div>)}
      </div> : <div className="h-[340px] bg-gradient-to-br from-emerald-950 via-zinc-800 to-zinc-950 md:h-[430px] lg:h-[540px]" />}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#101310] to-transparent" />
      {images.length > 1 && <span className="absolute bottom-28 right-5 rounded-full bg-black/45 px-3 py-1 text-xs text-white backdrop-blur">Prevuci fotografije · {images.length}</span>}
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-7xl px-5 pb-5 md:px-8 lg:px-12 lg:pb-10">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-emerald-300"><MapPin className="h-4 w-4" />{[location.region, location.country].filter(Boolean).join(', ')}</div>
        <h1 className="break-words text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl lg:text-5xl">{location.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${difficultyClass}`}>{location.difficulty || 'Destinacija'}</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white">{location.category_id}</span></div>
      </div>
    </section>

    <div className="grid grid-cols-2 gap-px border-y border-gray-200 bg-gray-200 dark:border-white/[0.06] dark:bg-white/[0.06] sm:grid-cols-4 lg:mx-auto lg:max-w-7xl lg:border-x lg:border-gray-200 dark:lg:border-white/[0.06]">
      {[[CalendarDays, 'Najbolje vreme', location.best_time || 'Tokom cele godine'], [Mountain, 'Težina', location.difficulty || 'Za svakoga'], [Clock3, 'Trajanje', location.duration_text || location.duration || 'Nije navedeno'], [Route, 'Nadmorska visina', (location.elevation_m ?? location.elevation) ? `${location.elevation_m ?? location.elevation} m` : 'Nije navedena']].map(([Icon, label, value]: any) => <div key={label} className="flex min-h-[76px] items-center gap-3 bg-zinc-50 dark:bg-[#151915] px-4 py-3"><Icon className="h-5 w-5 shrink-0 text-emerald-400" /><div className="min-w-0"><p className="text-[11px] text-zinc-500 dark:text-zinc-500">{label}</p><p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{value}</p></div></div>)}
    </div>

    <nav aria-label="Sadržaj lokacije" className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 px-5 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#101310]/95 md:px-8"><div className="flex gap-5 overflow-x-auto py-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">{[['overview','Pregled'],['explore','Istraži'],['practical','Praktično']].map(([id, label]) => <a key={id} href={`#${id}`} aria-current={activeTab === id ? 'location' : undefined} onClick={() => setActiveTab(id)} className={`relative shrink-0 py-1 transition ${activeTab === id ? 'font-semibold text-emerald-700 dark:text-emerald-300 after:absolute after:inset-x-0 after:-bottom-3 after:h-0.5 after:rounded-full after:bg-emerald-400' : 'hover:text-emerald-700 dark:hover:text-emerald-200'}`}>{label}</a>)}</div></nav>

    <div className="lg:mx-auto lg:grid lg:max-w-7xl lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-10 lg:px-10">
    <section id="overview" className="scroll-mt-32 px-5 py-7 md:px-8 lg:col-start-1 lg:px-0 lg:py-10">
      <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">O destinaciji</h2>
      <p className={`whitespace-pre-wrap text-sm leading-6 text-zinc-600 dark:text-zinc-400 ${expanded ? '' : 'line-clamp-3'}`}>{shortDescription}</p>
      {(description !== shortDescription || shortDescription.length > 160) && <button onClick={() => setExpanded(!expanded)} className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">{expanded ? 'Prikaži manje' : 'Pročitaj više'}</button>}
      {expanded && description !== shortDescription && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-600 dark:text-zinc-400">{description}</p>}
    </section>

    <section id="explore" className="scroll-mt-16 px-5 py-7 md:px-8 lg:col-start-1 lg:px-0 lg:py-10">
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Šta možeš da radiš i posetiš</h2>
      <div role="tablist" aria-label="Kategorije lokacije" className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-2 dark:border-white/[0.07] dark:bg-[#171b18] sm:grid-cols-4">
        {exploreTabs.map((tab) => <button key={tab.id} id={`tab-${tab.id}`} type="button" role="tab" aria-selected={activeExploreTab === tab.id} aria-disabled={tab.available === false} disabled={tab.available === false} title={tab.available === false ? 'Ova sekcija nije dostupna' : undefined} aria-label={tab.available === false ? `${tab.label}, nedostupno` : tab.label} aria-controls="explore-panel" onClick={() => setActiveExploreTab(tab.id)} className={`flex min-h-20 w-full min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-center text-sm font-semibold transition ${tab.available === false ? 'cursor-not-allowed bg-gray-100 text-zinc-400 dark:bg-white/[0.03] dark:text-zinc-600' : activeExploreTab === tab.id ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-950/40' : 'text-zinc-600 hover:bg-white hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.05] dark:hover:text-white'}`}>
          <span className="flex min-w-0 flex-wrap items-center justify-center gap-1.5">{tab.icon}<span className="break-words leading-tight">{tab.label}</span></span>
          <span className={`rounded-full px-2 py-0.5 text-xs ${tab.available === false ? 'bg-gray-200 text-zinc-500 dark:bg-white/[0.06] dark:text-zinc-500' : activeExploreTab === tab.id ? 'bg-white/15 text-white' : 'bg-gray-200 text-zinc-600 dark:bg-white/[0.06] dark:text-zinc-400'}`}>{tab.available === false ? 'Nedostupno' : tab.cards.length}</span>
        </button>)}
      </div>
      <div id="explore-panel" role="tabpanel" aria-labelledby={`tab-${selectedExploreTab.id}`} className="min-h-48">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">{selectedExploreTab.icon}<span>{selectedExploreTab.label}</span></div>
        {selectedExploreTab.cards.length ? <div className="divide-y divide-gray-200 dark:divide-white/[0.08]">{selectedExploreTab.cards.map((card, index) => <article key={`${card.title}-${index}`} className="py-6 first:pt-1 last:pb-1">
          <h3 className="break-words text-lg font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-xl">{card.title}</h3>
          {card.description && <p className="mt-3 break-words whitespace-pre-wrap text-[15px] leading-7 text-zinc-700 dark:text-zinc-300">{card.description}</p>}
          {!card.description && card.subtitle && <p className="mt-3 break-words whitespace-pre-wrap text-[15px] leading-7 text-zinc-700 dark:text-zinc-300">{card.subtitle}</p>}
          {card.image && <img src={card.image} alt={card.title} loading="lazy" className="mt-4 max-h-72 w-full rounded-2xl object-cover" />}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">{[card.kind, card.season, card.difficulty, card.price, card.distance].filter(Boolean).map((label) => <span key={label}>{label}</span>)}</div>
        </article>)}</div> : <div className="py-8 text-sm text-zinc-500 dark:text-zinc-500">Ova kategorija još nema unetih stavki.</div>}
      </div>
    </section>

    <section id="practical" className="scroll-mt-32 px-5 py-7 md:px-8 lg:col-start-2 lg:row-start-1 lg:sticky lg:top-20 lg:px-0 lg:py-10">
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Praktične informacije</h2>
      {(Array.isArray(location.warnings) ? location.warnings : location.warning ? [location.warning] : []).map((warning: string, index: number) => <div key={`${warning}-${index}`} className="mb-4 flex gap-3 rounded-2xl border border-orange-400/20 bg-orange-400/10 p-4 text-orange-800 dark:text-orange-100"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" /><div><p className="text-sm font-semibold">Važno za bezbednost</p><p className="mt-1 text-sm leading-5 text-orange-800/80 dark:text-orange-100/75">{warning}</p></div></div>)}
      <div className="mb-5 flex flex-wrap gap-2">{[[Baby,'Deca',location.child_friendly], [PawPrint,'Ljubimci',location.pet_allowed], [ParkingCircle,'Parking',location.parking_available]].map(([Icon, label, yes]: any) => <span key={label} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${yes ? 'border-sky-400/20 bg-sky-400/10 text-sky-700 dark:text-sky-200' : 'border-gray-200 dark:border-white/[0.06] bg-gray-100 dark:bg-white/[0.03] text-zinc-600'}`}><Icon className="h-3.5 w-3.5" />{label}{yes && <Check className="h-3 w-3" />}</span>)}</div>
    </section>
    </div>

    <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-3xl flex-col gap-2 border-t border-gray-200 bg-white/95 px-5 py-3 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#151915]/95 md:px-8 lg:inset-x-auto lg:bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:right-8 lg:mx-0 lg:w-80 lg:rounded-2xl lg:border lg:px-4 lg:py-4 lg:shadow-2xl">
      {favoriteMessage && <p role="alert" className="text-center text-xs text-red-600 dark:text-red-400">{favoriteMessage}</p>}
      <button onClick={toggleSaved} disabled={savingSaved} className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold disabled:opacity-60 ${saved ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'border-gray-200 bg-gray-50 text-zinc-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-100'}`}><Heart className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />{saved ? 'Sačuvano' : 'Sačuvaj'}</button>
    </div>
  </main>;
}
