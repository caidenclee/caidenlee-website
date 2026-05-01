'use client';

import { useState, useEffect, useRef } from 'react';
import { getTodaysTasks, addTask, toggleTask, deleteTask, clearCompletedDynamic, Task } from '@/lib/tasks';

interface DailyTasksProps {
  onBack: () => void;
  onOpenChat: () => void;
}

export default function DailyTasks({ onBack, onOpenChat }: DailyTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showInput, setShowInput] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [setupDone, setSetupDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTasks(getTodaysTasks());
  }, []);

  const isEmpty = tasks.length === 0 && !setupDone;

  useEffect(() => {
    if (showInput) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showInput]);

  const refresh = () => setTasks(getTodaysTasks());

  const handleToggle = (id: string) => {
    toggleTask(id);
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteTask(id);
    refresh();
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) {
      setShowInput(false);
      return;
    }
    addTask(newTaskTitle.trim(), false);
    setNewTaskTitle('');
    setShowInput(false);
    refresh();
  };

  const handleClearCompleted = () => {
    clearCompletedDynamic();
    refresh();
  };

  const routineTasks = tasks.filter((t) => t.isRoutine);
  const dynamicTasks = tasks.filter((t) => !t.isRoutine);
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const hasCompleted = dynamicTasks.some((t) => t.completed);

  if (isEmpty) {
    return (
      <div className="full-screen flex flex-col">
        <div className="flex items-center justify-between px-4 pt-safe pb-3 border-b border-white/5 shrink-0">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-smooth active:scale-95">
            <span className="text-white/60 text-xl">←</span>
          </button>
          <h2 className="text-white font-medium tracking-wide">Daily Tasks</h2>
          <div className="w-10" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5">
          <div className="w-14 h-14 rounded-full bg-emerald-400/10 flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <path d="M10 7h10M10 13h10M10 19h10" stroke="rgba(52,211,153,0.7)" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M5 6l1.5 1.5L9 5" stroke="rgba(52,211,153,0.7)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 12l1.5 1.5L9 11" stroke="rgba(52,211,153,0.7)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 18l1.5 1.5L9 17" stroke="rgba(52,211,153,0.7)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="space-y-2">
            <p className="text-white font-medium">No tasks for today</p>
            <p className="text-white/40 text-sm leading-relaxed">
              Want Faith to help you build out your list? She'll ask a few questions and get you set up.
            </p>
          </div>
          <button
            onClick={onOpenChat}
            className="px-6 py-3 rounded-2xl text-sm font-medium transition-smooth active:scale-95"
            style={{ backgroundColor: 'rgba(52,211,153,0.15)', color: '#34d399' }}
          >
            Talk to Faith
          </button>
          <button onClick={() => setSetupDone(true)} className="text-white/25 text-xs">
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="full-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe pb-3 border-b border-white/5 shrink-0">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-smooth active:scale-95"
          aria-label="Back"
        >
          <span className="text-white/60 text-xl">←</span>
        </button>
        <h2 className="text-white font-medium tracking-wide">Daily Tasks</h2>
        <button
          onClick={() => setShowInput(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-400 transition-smooth active:scale-95"
          aria-label="Add task"
        >
          <span className="text-white text-xl font-light">+</span>
        </button>
      </div>

      {/* Progress */}
      <div className="px-6 pt-5 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-white/40 text-xs tracking-widest uppercase">Progress</p>
          <p className="text-white/40 text-xs">
            {completedTasks}/{totalTasks} done
          </p>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="progress-bar h-full bg-blue-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        {progress === 100 && totalTasks > 0 && (
          <p className="text-blue-400 text-xs mt-2 text-center">
            🎉 You crushed it today, Caiden!
          </p>
        )}
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto scroll-momentum px-4 pb-8 space-y-6">
        {/* Add task input */}
        {showInput && (
          <div className="bg-[#111] border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3 animate-slide-up">
            <input
              ref={inputRef}
              type="text"
              placeholder="New task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTask();
                if (e.key === 'Escape') { setShowInput(false); setNewTaskTitle(''); }
              }}
              className="flex-1 bg-transparent text-white text-sm placeholder-white/25"
            />
            <button
              onClick={handleAddTask}
              className="text-blue-400 text-sm font-medium hover:text-blue-300"
            >
              Add
            </button>
            <button
              onClick={() => { setShowInput(false); setNewTaskTitle(''); }}
              className="text-white/30 text-sm hover:text-white/50"
            >
              ✕
            </button>
          </div>
        )}

        {/* Fixed routine tasks */}
        {routineTasks.length > 0 && (
          <div>
            <p className="text-white/40 text-xs tracking-widest uppercase mb-3 px-1">
              Fixed Routine
            </p>
            <div className="space-y-2">
              {routineTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => handleToggle(task.id)}
                  onDelete={undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* Dynamic tasks */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-white/40 text-xs tracking-widest uppercase">
              Today's Tasks
            </p>
            {hasCompleted && (
              <button
                onClick={handleClearCompleted}
                className="text-white/30 text-xs hover:text-white/50 transition-smooth"
              >
                Clear done
              </button>
            )}
          </div>

          {dynamicTasks.length === 0 ? (
            <div className="bg-[#111] border border-white/5 rounded-2xl px-4 py-6 text-center">
              <p className="text-white/30 text-sm">No tasks yet — tap + to add one</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dynamicTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => handleToggle(task.id)}
                  onDelete={() => handleDelete(task.id)}
                />
              ))}
            </div>
          )}
        </div>

        {tasks.length === 0 && !showInput && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <p className="text-4xl">✅</p>
            <p className="text-white/40 text-sm leading-relaxed px-8">
              Nothing on the list yet. Tap + to add tasks, or I can add them for you during our chat.
            </p>
          </div>
        )}
      </div>

      {/* Add more footer */}
      <div className="shrink-0 px-4 py-3 border-t border-white/5">
        <button
          onClick={onOpenChat}
          className="w-full py-2.5 rounded-2xl text-sm font-medium text-emerald-400/70 hover:text-emerald-400 bg-emerald-400/5 hover:bg-emerald-400/10 transition-smooth active:scale-95"
        >
          + Ask Faith to add more
        </button>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onDelete?: () => void;
}) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      className="bg-[#111] border border-white/5 rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-smooth"
      onClick={() => onDelete && setShowDelete(!showDelete)}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-smooth active:scale-90"
        style={{
          borderColor: task.completed ? '#3b82f6' : 'rgba(255,255,255,0.2)',
          backgroundColor: task.completed ? '#3b82f6' : 'transparent',
        }}
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {task.completed && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path
              d="M1 4L3.5 6.5L9 1"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Title */}
      <p
        className="flex-1 text-sm transition-smooth"
        style={{
          color: task.completed ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.9)',
          textDecoration: task.completed ? 'line-through' : 'none',
        }}
      >
        {task.title}
      </p>

      {/* Routine badge */}
      {task.isRoutine && (
        <span className="text-white/20 text-xs px-2 py-0.5 bg-white/5 rounded-full">
          routine
        </span>
      )}

      {/* Delete */}
      {onDelete && showDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="shrink-0 w-8 h-8 flex items-center justify-center text-red-400/60 hover:text-red-400"
          aria-label="Delete task"
        >
          🗑️
        </button>
      )}
    </div>
  );
}
