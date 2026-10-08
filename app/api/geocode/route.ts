const COUNTRY_CODES: Record<string, string> = {
  'Albanija': 'al',
  'Bosna i Hercegovina': 'ba',
  'Bugarska': 'bg',
  'Crna Gora': 'me',
  'Grčka': 'gr',
  'Hrvatska': 'hr',
  'Rumunija': 'ro',
  'Severna Makedonija': 'mk',
  'Slovenija': 'si',
  'Srbija': 'rs',
};

// Use familiar local names where a translated or abbreviated database title
// can match an unrelated place in the same country.
const SEARCH_NAMES: Record<string, string[]> = {
  'albanski-alpi-teth-valbona': ['Theth, Albania', 'Valbona, Albania'],
  'beograd': ['Belgrade, Serbia'],
  'crveno-jezero-lacu-rosu': ['Lacul Roșu, Romania'],
  'durmitor': ['Durmitor National Park, Montenegro', 'Žabljak, Montenegro'],
  'jezero-kerkini': ['Lake Kerkini, Greece'],
  'komansko-jezero': ['Komani Lake, Albania'],
  'meteori': ['Meteora, Thessaly, Greece'],
  'ohridsko-jezero': ['Lake Ohrid, North Macedonia'],
  'olimp': ['Olympos National Park, Pieria, Greece'],
  'parga': ['Parga, Greece'],
  'petrovac-na-moru': ['Petrovac, Montenegro'],
  'poluostrvo-klek': ['Klek, Neum, Bosnia and Herzegovina'],
  'sedam-rilskih-jezera': ['Seven Rila Lakes, Bulgaria'],
  'suncev-breg': ['Sunny Beach, Nessebar, Bulgaria'],
  'trnovacko-jezero': ['Trnovačko Lake, Bosnia and Herzegovina'],
  'uvac-vidikovac-molitva': ['Molitva viewpoint, Uvac, Serbia'],
};

type GeoapifyResult = { lat?: number; lon?: number; country_code?: string; result_type?: string };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title')?.trim();
  const region = searchParams.get('region')?.trim();
  const country = searchParams.get('country')?.trim();
  const slug = searchParams.get('slug')?.trim() ?? '';
  const apiKey = process.env.GEOAPIFY_API_KEY || process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
  const countryCode = country ? COUNTRY_CODES[country] : undefined;

  if (!title || title.length > 120 || !countryCode) {
    return Response.json({ error: 'Nedostaju validni podaci o destinaciji.' }, { status: 400 });
  }
  if (!apiKey) {
    return Response.json({ error: 'Geoapify ključ nije podešen na serveru.' }, { status: 503 });
  }

  const candidates = [
    ...(SEARCH_NAMES[slug] ?? []),
    [title, region, country].filter(Boolean).join(', '),
    `${title}, ${country}`,
  ].filter((value, index, all) => all.indexOf(value) === index);

  try {
    for (const text of candidates) {
      const params = new URLSearchParams({
        text,
        filter: `countrycode:${countryCode}`,
        format: 'json',
        limit: '3',
        lang: 'en',
        apiKey,
      });
      const response = await fetch(`https://api.geoapify.com/v1/geocode/search?${params}`, {
        next: { revalidate: 60 * 60 * 24 * 30 },
      });
      if (!response.ok) {
        return Response.json({ error: 'Geoapify nije uspeo da pronađe lokaciju.' }, { status: 502 });
      }
      const data = await response.json();
      const result = (data.results as GeoapifyResult[] | undefined)?.find((item) =>
        item.country_code === countryCode && item.result_type !== 'country' &&
        typeof item.lat === 'number' && typeof item.lon === 'number'
      );
      if (result) return Response.json({ lat: result.lat, lon: result.lon });
    }

    return Response.json({ error: 'Koordinate za ovu destinaciju nisu pronađene.' }, { status: 404 });
  } catch {
    return Response.json({ error: 'Geoapify trenutno nije dostupan.' }, { status: 502 });
  }
}
