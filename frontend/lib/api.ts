import { UserProfile, StreamEvent, SavingsAnalysis } from './types';

const API_BASE = '/api';

export async function fetchSavings(profile: UserProfile): Promise<SavingsAnalysis> {
  const res = await fetch(`${API_BASE}/savings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile }),
  });
  if (!res.ok) throw new Error('Failed to fetch savings data');
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
