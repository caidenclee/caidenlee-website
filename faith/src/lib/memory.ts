const MEMORY_KEY = 'faith_memories';

export type MemoryCategory =
  | 'Cubing & Competition'
  | 'YouTube & Content'
  | 'Sponsorships'
  | 'Coaching'
  | 'Personal Preferences'
  | 'Daily Routines'
  | 'Goals'
  | 'Preferences'
  | 'Habits'
  | 'Personal'
  | 'Personal Background'
  | string; // allow Faith to use any category from the prompt

export const MEMORY_CATEGORIES: MemoryCategory[] = [
  'Cubing & Competition',
  'YouTube & Content',
  'Sponsorships',
  'Coaching',
  'Personal Preferences',
  'Daily Routines',
  'Goals',
  'Preferences',
  'Habits',
  'Personal',
  'Personal Background',
];

export interface Memory {
  id: string;
  category: MemoryCategory;
  content: string;
  timestamp: number;
}

export function getMemories(): Memory[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Memory[];
  } catch {
    return [];
  }
}

export function addMemory(category: MemoryCategory, content: string): Memory {
  const memories = getMemories();
  const newMemory: Memory = {
    id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    category,
    content,
    timestamp: Date.now(),
  };
  memories.push(newMemory);
  if (typeof window !== 'undefined') {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memories));
  }
  return newMemory;
}

export function deleteMemory(id: string): void {
  if (typeof window === 'undefined') return;
  const memories = getMemories().filter((m) => m.id !== id);
  localStorage.setItem(MEMORY_KEY, JSON.stringify(memories));
}

export function getMemoriesAsContext(): string {
  const memories = getMemories();
  if (memories.length === 0) return '';

  const grouped: Partial<Record<MemoryCategory, Memory[]>> = {};
  for (const mem of memories) {
    if (!grouped[mem.category]) grouped[mem.category] = [];
    grouped[mem.category]!.push(mem);
  }

  const lines: string[] = [];
  for (const category of MEMORY_CATEGORIES) {
    const catMems = grouped[category];
    if (catMems && catMems.length > 0) {
      lines.push(`**${category}:**`);
      for (const mem of catMems) {
        lines.push(`- ${mem.content}`);
      }
    }
  }

  return lines.join('\n');
}

export function clearAllMemories(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(MEMORY_KEY);
}
