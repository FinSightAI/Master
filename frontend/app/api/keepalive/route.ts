// Vercel Cron — runs every 5 min (see vercel.json).
// Pings every Render free-tier backend so they never sleep.
import { NextResponse } from 'next/server';

const BACKENDS = [
  'https://master-backend-79jx.onrender.com/health',  // WizeTax
  'https://vitara.onrender.com/',                      // WizeHealth
];

export async function GET() {
  const results = await Promise.allSettled(
    BACKENDS.map(url =>
      fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(25000) })
        .then(r => ({ url, status: r.status }))
        .catch(e => ({ url, error: String(e) }))
    )
  );
  const summary = results.map(r => (r.status === 'fulfilled' ? r.value : r.reason));
  return NextResponse.json({ ok: true, ts: new Date().toISOString(), results: summary });
}
