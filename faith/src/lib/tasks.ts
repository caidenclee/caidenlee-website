const TASKS_KEY = 'faith_tasks';
const LAST_RESET_KEY = 'faith_tasks_last_reset';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  isRoutine: boolean;
  date: string; // YYYY-MM-DD
}

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

function generateId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Auto-reset routine tasks if it's a new day
function maybeResetDaily(tasks: Task[]): Task[] {
  if (typeof window === 'undefined') return tasks;

  const today = todayString();
  const lastReset = localStorage.getItem(LAST_RESET_KEY);

  if (lastReset !== today) {
    // Reset completion for routine tasks
    const reset = tasks.map((t) =>
      t.isRoutine ? { ...t, completed: false, date: today } : t
    );
    localStorage.setItem(LAST_RESET_KEY, today);
    localStorage.setItem(TASKS_KEY, JSON.stringify(reset));
    return reset;
  }

  return tasks;
}

export function getTodaysTasks(): Task[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    const tasks: Task[] = raw ? JSON.parse(raw) : [];
    return maybeResetDaily(tasks);
  } catch {
    return [];
  }
}

export function addTask(title: string, isRoutine = false): Task {
  const tasks = getTodaysTasks();
  const newTask: Task = {
    id: generateId(),
    title,
    completed: false,
    isRoutine,
    date: todayString(),
  };
  tasks.push(newTask);
  if (typeof window !== 'undefined') {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }
  return newTask;
}

export function toggleTask(id: string): void {
  if (typeof window === 'undefined') return;
  const tasks = getTodaysTasks();
  const updated = tasks.map((t) =>
    t.id === id ? { ...t, completed: !t.completed } : t
  );
  localStorage.setItem(TASKS_KEY, JSON.stringify(updated));
}

export function deleteTask(id: string): void {
  if (typeof window === 'undefined') return;
  const tasks = getTodaysTasks().filter((t) => t.id !== id);
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

// Clear completed non-routine tasks
export function clearCompletedDynamic(): void {
  if (typeof window === 'undefined') return;
  const tasks = getTodaysTasks().filter((t) => !(t.completed && !t.isRoutine));
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

// Reset all tasks (full reset, not just daily)
export function resetDailyTasks(): void {
  if (typeof window === 'undefined') return;
  const tasks = getTodaysTasks().map((t) => ({ ...t, completed: false }));
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  localStorage.setItem(LAST_RESET_KEY, todayString());
}
