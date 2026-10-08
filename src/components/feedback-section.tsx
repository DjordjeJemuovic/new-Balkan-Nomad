'use client';

import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';

const feedbackTypes = ['Predlog', 'Pitanje', 'Kritika', 'Pohvala', 'Drugo'];

export default function FeedbackSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState(feedbackTypes[0]);
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setSending(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, type, message, website }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Poruka nije poslata. Pokušaj ponovo.');

      setStatus({ kind: 'success', text: 'Hvala ti! Poruka je poslata.' });
      setName('');
      setEmail('');
      setType(feedbackTypes[0]);
      setMessage('');
      setWebsite('');
    } catch (error) {
      setStatus({ kind: 'error', text: error instanceof Error ? error.message : 'Poruka nije poslata. Pokušaj ponovo.' });
    } finally {
      setSending(false);
    }
  };

  const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-white/10 dark:bg-[#101310] dark:text-zinc-100 dark:placeholder:text-zinc-500';

  return <footer id="feedback" className="w-full border-t border-gray-200 bg-gray-50 px-5 pb-32 pt-10 dark:border-white/[0.07] dark:bg-[#151915] md:px-8 md:pt-12">
    <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Balkan Nomad · Kontakt</p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">Podeli utisak ili pitanje</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-zinc-600 dark:text-zinc-400">Predloži šta da unapredimo, postavi pitanje, pošalji kritiku ili pohvalu. Email je opcionalan; za odgovor unesi svoju adresu.</p>
      </div>

      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="feedback-name" className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Ime ili korisničko ime</label>
          <input id="feedback-name" name="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="nickname" className={inputClass} placeholder="Kako da te oslovimo?" />
        </div>
        <div>
          <label htmlFor="feedback-email" className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Email <span className="font-normal text-zinc-400">(opciono)</span></label>
          <input id="feedback-email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="email" className={inputClass} placeholder="ime@primer.com" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="feedback-type" className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Vrsta poruke</label>
          <select id="feedback-type" name="type" value={type} onChange={(event) => setType(event.target.value)} className={inputClass}>
            {feedbackTypes.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="feedback-message" className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Poruka</label>
          <textarea id="feedback-message" name="message" value={message} onChange={(event) => setMessage(event.target.value)} required minLength={5} maxLength={4000} rows={4} className={`${inputClass} resize-y`} placeholder="Napiši svoju poruku…" />
        </div>
        <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
          <label htmlFor="feedback-website">Ostavi ovo polje prazno</label>
          <input id="feedback-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
        </div>
        <div className="flex flex-col items-start justify-between gap-3 sm:col-span-2 sm:flex-row sm:items-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Unesi ime/korisničko ime ili email. Poruka ide direktno vlasniku sajta.</p>
          <button type="submit" disabled={sending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500">
            <Send className="h-4 w-4" />{sending ? 'Šaljem…' : 'Pošalji poruku'}
          </button>
        </div>
        {status && <p role={status.kind === 'error' ? 'alert' : 'status'} className={`sm:col-span-2 text-sm ${status.kind === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'}`}>{status.text}</p>}
      </form>
    </div>
  </footer>;
}
