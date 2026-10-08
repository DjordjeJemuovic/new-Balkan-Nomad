'use client';

import { useEffect, useState } from 'react';

type Coordinates = { lat: number; lon: number };

export default function DestinationMap({ title, region, country }: { title: string; region?: string | null; country?: string | null }) {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found' | 'error'>('loading');

  useEffect(() => {
    const text = [title, region, country].filter(Boolean).join(', ');
    let cancelled = false;

    fetch(`/api/geocode?${new URLSearchParams({ text })}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Geocoding request failed');
        return response.json();
      })
      .then((data: Coordinates) => {
        if (cancelled) return;
        if (typeof data.lat !== 'number' || typeof data.lon !== 'number') {
          setStatus('not-found');
          return;
        }
        setCoordinates(data);
        setStatus('ready');
      })
      .catch(() => { if (!cancelled) setStatus('error'); });

    return () => { cancelled = true; };
  }, [title, region, country]);

  if (status !== 'ready' || !coordinates) {
    const message = status === 'loading'
      ? 'Pronalaženje lokacije na mapi…'
      : status === 'not-found'
        ? 'Koordinate za ovu destinaciju nisu pronađene.'
        : 'Mapa trenutno nije dostupna. Proveri Geoapify API ključ.';
    return <div className="flex min-h-52 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 px-5 text-center text-sm text-zinc-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-400" role="status">{message}</div>;
  }

  const lat = coordinates.lat;
  const lon = coordinates.lon;
  const bbox = `${lon - 0.035},${lat - 0.02},${lon + 0.035},${lat + 0.02}`;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?${new URLSearchParams({ bbox, layer: 'mapnik', marker: `${lat},${lon}` })}`;
  const openMapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=13/${lat}/${lon}`;

  return <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.08]">
    <iframe
      title={`Mapa za ${title}`}
      src={mapUrl}
      className="h-56 w-full border-0 sm:h-72"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
    <div className="flex items-center justify-between gap-2 px-3 py-2 text-[11px] text-zinc-500 dark:text-zinc-400">
      <span>Koordinate pronađene preko Geoapify · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap</a></span>
      <a href={openMapUrl} target="_blank" rel="noreferrer" className="shrink-0 font-medium text-emerald-700 dark:text-emerald-300">Otvori mapu</a>
    </div>
  </div>;
}
