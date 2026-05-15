import { UserProfile, StreamEvent, SavingsAnalysis, IsraelProfile, IsraelAnalysis, CompanyAnalysis, TaxUpdate } from './types';
import { getIdToken } from './firebase';
import { stripIdentity } from './pii';

const API_BASE = '/api';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getIdToken();
  return token
    ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

export async function fetchCountry(code: string, signal?: AbortSignal): Promise<{ code: string; data: Record<string, unknown>; exit_tax: Record<string, unknown> }> {
  // Country tax tables only change when PwC publishes the next year's data —
  // safe to cache for an hour. Next.js dedups concurrent calls automatically.
  const res = await fetch(`${API_BASE}/country/${code}`, { signal, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error('Failed to fetch country data');
  return res.json();
}

export async function analyzeDocument(filename: string, contentBase64: string, mediaType: string, language: string, signal?: AbortSignal): Promise<{ analysis?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ filename, content_base64: contentBase64, media_type: mediaType, language }),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail?.message_he || err?.detail?.message || 'Failed to analyze document');
  }
  return res.json();
}

export async function fetchSavings(profile: UserProfile, signal?: AbortSignal): Promise<SavingsAnalysis> {
  const res = await fetch(`${API_BASE}/savings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile: stripIdentity(profile) }),
    signal,
  });
  if (!res.ok) throw new Error('Failed to fetch savings data');
  return res.json();
}

export async function fetchIsraelAnalysis(profile: UserProfile | null, israelProfile: IsraelProfile, signal?: AbortSignal): Promise<IsraelAnalysis> {
  const res = await fetch(`${API_BASE}/israel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile: stripIdentity(profile || {}),
      israel_profile: stripIdentity(israelProfile),
    }),
    signal,
  });
  if (!res.ok) throw new Error('Failed to fetch Israel analysis');
  return res.json();
}

export async function fetchCompanyAnalysis(profit: number, isNondom: boolean, preferEu: boolean, signal?: AbortSignal): Promise<CompanyAnalysis> {
  const res = await fetch(`${API_BASE}/company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profit, is_nondom: isNondom, prefer_eu: preferEu }),
    signal,
  });
  if (!res.ok) throw new Error('Failed to fetch company analysis');
  return res.json();
}

export async function fetchTaxUpdates(signal?: AbortSignal): Promise<TaxUpdate[]> {
  // Tax-update feed refreshes at most daily. 30-min Next.js cache cuts the
  // weekly fetch volume by ~50× while keeping the feed reasonably fresh.
  const res = await fetch(`${API_BASE}/tax-updates`, { signal, next: { revalidate: 1800 } });
  if (!res.ok) throw new Error('Failed to fetch tax updates');
  return res.json();
}

async function _sendChat(message: string, profile: UserProfile | null, conversationHistory: Array<{ role: string; content: string }>, provider?: string) {
  return fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      // user message is whatever they typed — we don't rewrite it, but the
      // pii helper's scrubString does run over any objects we pass.
      message,
      // strip name/email/phone/IDs from the profile context BEFORE the AI
      // provider sees it. Numbers (income, balances) kept for answer accuracy.
      profile: profile ? stripIdentity(profile) : null,
      conversation_history: conversationHistory,
      provider: provider ?? null,
    }),
  });
}

export async function* streamChat(
  message: string,
  profile: UserProfile | null,
  conversationHistory: Array<{ role: string; content: string }>,
  provider?: string
): AsyncGenerator<StreamEvent> {
  let response = await _sendChat(message, profile, conversationHistory, provider);

  // Render free tier sleeps after 15 min idle and returns 502/503 during cold
  // start. Auto-retry once after warming /health (takes ~25s on Render free).
  // User-facing copy is intentionally vague — they don't need to hear about
  // server-warming machinery, just that the answer is on its way.
  if (response.status === 502 || response.status === 503 || response.status === 504) {
    const lang = (typeof window !== 'undefined' ? localStorage.getItem('wl_lang') : null) || 'he';
    const msg = (
      { he: '⏳ רגע אחד, מכין את התשובה…',
        en: '⏳ One moment, getting your answer…',
        pt: '⏳ Um momento, preparando a resposta…',
        es: '⏳ Un momento, preparando la respuesta…' } as Record<string, string>
    )[lang] || '⏳ One moment…';
    yield { type: 'status', message: msg };
    // Poll every 3 s — Render typically wakes in 10-20 s, so we succeed by attempt 4-7.
    for (let attempt = 0; attempt < 12; attempt++) {
      await new Promise(r => setTimeout(r, 3000));
      response = await _sendChat(message, profile, conversationHistory, provider);
      if (response.status !== 502 && response.status !== 503 && response.status !== 504) break;
    }
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const lang2 = (typeof window !== 'undefined' ? localStorage.getItem('wl_lang') : null) || 'he';
    const fallback: Record<string, string> = {
      he: '⏳ השרת עדיין מתחמם — נסה שוב בעוד 30 שניות',
      en: '⏳ The server is warming up — try again in 30 seconds',
      pt: '⏳ O servidor está iniciando — tente novamente em 30 segundos',
      es: '⏳ El servidor está iniciando — intenta de nuevo en 30 segundos',
    };
    const msg = err?.detail?.message_he || err?.detail?.message
      || ([502, 503, 504].includes(response.status) ? (fallback[lang2] || fallback.en) : `Server error: ${response.status}`);
    yield { type: 'status', message: msg };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: 'error', message: 'No response body' };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (!data) continue;
        try {
          const event = JSON.parse(data) as StreamEvent;
          yield event;
          if (event.type === 'done' || event.type === 'error') return;
        } catch {
          // ignore malformed lines
        }
      }
    }
  }
}
