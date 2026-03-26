import { UserProfile, StreamEvent, SavingsAnalysis, IsraelProfile, IsraelAnalysis, CompanyAnalysis, TaxUpdate } from './types';

const API_BASE = '/api';

export async function fetchCountry(code: string): Promise<{ code: string; data: Record<string, unknown>; exit_tax: Record<string, unknown> }> {
  const res = await fetch(`${API_BASE}/country/${code}`);
  if (!res.ok) throw new Error('Failed to fetch country data');
  return res.json();
}

export async function analyzeDocument(filename: string, contentBase64: string, mediaType: string, language: string): Promise<{ analysis?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, content_base64: contentBase64, media_type: mediaType, language }),
  });
  if (!res.ok) throw new Error('Failed to analyze document');
  return res.json();
}

export async function fetchSavings(profile: UserProfile): Promise<SavingsAnalysis> {
  const res = await fetch(`${API_BASE}/savings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile }),
  });
  if (!res.ok) throw new Error('Failed to fetch savings data');
  return res.json();
}

export async function fetchIsraelAnalysis(profile: UserProfile | null, israelProfile: IsraelProfile): Promise<IsraelAnalysis> {
  const res = await fetch(`${API_BASE}/israel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile: profile || {}, israel_profile: israelProfile }),
  });
  if (!res.ok) throw new Error('Failed to fetch Israel analysis');
  return res.json();
}

export async function fetchCompanyAnalysis(profit: number, isNondom: boolean, preferEu: boolean): Promise<CompanyAnalysis> {
  const res = await fetch(`${API_BASE}/company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profit, is_nondom: isNondom, prefer_eu: preferEu }),
  });
  if (!res.ok) throw new Error('Failed to fetch company analysis');
  return res.json();
}

export async function fetchTaxUpdates(): Promise<TaxUpdate[]> {
  const res = await fetch(`${API_BASE}/tax-updates`);
  if (!res.ok) throw new Error('Failed to fetch tax updates');
  return res.json();
}

export async function* streamChat(
  message: string,
  profile: UserProfile | null,
  conversationHistory: Array<{ role: string; content: string }>
): AsyncGenerator<StreamEvent> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      profile,
      conversation_history: conversationHistory,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    yield { type: 'error', message: `Server error: ${err}` };
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
