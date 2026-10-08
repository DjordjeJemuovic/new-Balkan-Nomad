const recipient = 'jemuovicdjordje98@gmail.com';
const allowedTypes = ['Predlog', 'Pitanje', 'Kritika', 'Pohvala', 'Drugo'] as const;
const submissions = new Map<string, { count: number; expiresAt: number }>();

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 12_000) {
    return Response.json({ error: 'Poruka je prevelika.' }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Podaci forme nisu ispravni.' }, { status: 400 });
  }

  // Quietly discard automated submissions that fill the hidden field.
  if (typeof body.website === 'string' && body.website.trim()) {
    return Response.json({ ok: true });
  }

  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const clientIp = forwardedFor || request.headers.get('x-real-ip') || 'unknown';
  const now = Date.now();
  const previous = submissions.get(clientIp);
  if (previous && previous.expiresAt > now && previous.count >= 5) {
    return Response.json({ error: 'Previše poruka je poslato. Pokušaj ponovo za nekoliko minuta.' }, { status: 429 });
  }
  submissions.set(clientIp, previous && previous.expiresAt > now
    ? { count: previous.count + 1, expiresAt: previous.expiresAt }
    : { count: 1, expiresAt: now + 10 * 60 * 1000 });

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const type = typeof body.type === 'string' ? body.type : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (name.length > 80 || email.length > 254 || message.length < 5 || message.length > 4000) {
    return Response.json({ error: 'Proveri ime, email i dužinu poruke (5–4000 karaktera).' }, { status: 400 });
  }
  if (!name && !email) {
    return Response.json({ error: 'Unesi email ili ime/korisničko ime.' }, { status: 400 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Unesi ispravnu email adresu.' }, { status: 400 });
  }
  if (!allowedTypes.includes(type as (typeof allowedTypes)[number])) {
    return Response.json({ error: 'Izaberi vrstu poruke.' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Slanje poruka još nije podešeno. Pokušaj ponovo kasnije.' }, { status: 503 });
  }

  const from = process.env.FEEDBACK_FROM_EMAIL || 'Balkan Nomad <onboarding@resend.dev>';
  const text = [
    `Vrsta poruke: ${type}`,
    `Ime / korisničko ime: ${name || 'Nije navedeno'}`,
    `Email za odgovor: ${email || 'Nije naveden'}`,
    '',
    'Poruka:',
    message,
  ].join('\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        ...(email ? { reply_to: email } : {}),
        subject: `[Balkan Nomad] ${type}`,
        text,
      }),
    });

    if (!response.ok) {
      return Response.json({ error: 'Poruka nije poslata. Pokušaj ponovo kasnije.' }, { status: 502 });
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Email servis trenutno nije dostupan.' }, { status: 502 });
  }
}
