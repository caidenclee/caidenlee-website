const HISTORY_KEY = 'faith_chat_history';
const MAX_MESSAGES = 60; // keep last 60 messages (~30 exchanges)

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function loadHistory(): HistoryMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryMessage[];
  } catch {
    return [];
  }
}

export function saveHistory(messages: { role: 'user' | 'assistant'; content: string }[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Preserve existing timestamps for old messages; add timestamp to new ones
    const existing = loadHistory();
    const existingMap = new Map(existing.map((m, i) => [`${m.role}:${i}`, m.timestamp]));

    const withTimestamps: HistoryMessage[] = messages.map((m, i) => ({
      ...m,
      timestamp: existingMap.get(`${m.role}:${i}`) ?? Date.now(),
    }));

    // Trim to max
    const trimmed = withTimestamps.slice(-MAX_MESSAGES);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage full or unavailable
  }
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(HISTORY_KEY);
}

export function getHistoryForContext(): string {
  const messages = loadHistory();
  if (messages.length === 0) return '';
  // Return last 10 exchanges as a readable summary for context
  const recent = messages.slice(-20);
  return recent
    .map((m) => {
      const date = new Date(m.timestamp).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
      });
      return `[${date}] ${m.role === 'user' ? 'Caiden' : 'Faith'}: ${m.content.slice(0, 200)}`;
    })
    .join('\n');
}
