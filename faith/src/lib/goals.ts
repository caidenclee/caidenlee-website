const GOALS_KEY = 'faith_goals';

export interface Goal {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

const DEFAULT_GOALS: Goal[] = [
  {
    id: 'goal_default_1',
    title: 'Hit sub-6 second solves',
    completed: false,
    createdAt: Date.now(),
  },
  {
    id: 'goal_default_2',
    title: 'Grow YouTube channel',
    completed: false,
    createdAt: Date.now(),
  },
  {
    id: 'goal_default_3',
    title: 'Secure GAN sponsorship',
    completed: false,
    createdAt: Date.now(),
  },
];

export function getGoals(): Goal[] {
  if (typeof window === 'undefined') return DEFAULT_GOALS;
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (!raw) {
      // Seed with defaults on first load
      localStorage.setItem(GOALS_KEY, JSON.stringify(DEFAULT_GOALS));
      return DEFAULT_GOALS;
    }
    return JSON.parse(raw) as Goal[];
  } catch {
    return DEFAULT_GOALS;
  }
}

export function addGoal(title: string): Goal {
  const goals = getGoals();
  const newGoal: Goal = {
    id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    completed: false,
    createdAt: Date.now(),
  };
  goals.push(newGoal);
  if (typeof window !== 'undefined') {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  }
  return newGoal;
}

export function toggleGoal(id: string): void {
  if (typeof window === 'undefined') return;
  const goals = getGoals();
  const updated = goals.map((g) =>
    g.id === id ? { ...g, completed: !g.completed } : g
  );
  localStorage.setItem(GOALS_KEY, JSON.stringify(updated));
}

export function deleteGoal(id: string): void {
  if (typeof window === 'undefined') return;
  const goals = getGoals().filter((g) => g.id !== id);
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}
