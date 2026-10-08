export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text')?.trim();
  const apiKey = process.env.GEOAPIFY_API_KEY || process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

  if (!text || text.length > 200) {
    return Response.json({ error: 'Unesi validan naziv lokacije.' }, { status: 400 });
  }
  if (!apiKey) {
    return Response.json({ error: 'Geoapify ključ nije podešen na serveru.' }, { status: 503 });
  }

  const params = new URLSearchParams({ text, format: 'json', limit: '1', lang: 'sr', apiKey });
  try {
    const response = await fetch(`https://api.geoapify.com/v1/geocode/search?${params}`, {
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!response.ok) {
      return Response.json({ error: 'Geoapify nije uspeo da pronađe lokaciju.' }, { status: 502 });
    }
    const data = await response.json();
    const result = data.results?.[0];
    if (!result || typeof result.lat !== 'number' || typeof result.lon !== 'number') {
      return Response.json({ error: 'Koordinate za ovu destinaciju nisu pronađene.' }, { status: 404 });
    }

    return Response.json({ lat: result.lat, lon: result.lon });
  } catch {
    return Response.json({ error: 'Geoapify trenutno nije dostupan.' }, { status: 502 });
  }
}
