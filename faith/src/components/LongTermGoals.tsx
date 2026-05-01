'use client';

import { useState, useEffect, useRef } from 'react';
import { getGoals, addGoal, toggleGoal, deleteGoal, Goal } from '@/lib/goals';

interface LongTermGoalsProps {
  onBack: () => void;
  onOpenChat: () => void;
}

export default function LongTermGoals({ onBack, onOpenChat }: LongTermGoalsProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showInput, setShowInput] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [setupDone, setSetupDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGoals(getGoals());
  }, []);

  useEffect(() => {
    if (showInput) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showInput]);

  const refresh = () => setGoals(getGoals());

  const handleToggle = (id: string) => {
    toggleGoal(id);
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteGoal(id);
    refresh();
  };

  const handleAddGoal = () => {
    if (!newGoalTitle.trim()) {
      setShowInput(false);
      return;
    }
    addGoal(newGoalTitle.trim());
    setNewGoalTitle('');
    setShowInput(false);
    refresh();
  };

  const isEmpty = goals.length === 0 && !setupDone;
  const inProgress = goals.filter((g) => !g.completed);
  const completed = goals.filter((g) => g.completed);

  if (isEmpty) {
    return (
      <div className="full-screen flex flex-col">
        <div className="flex items-center justify-between px-4 pt-safe pb-3 border-b border-white/5 shrink-0">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-smooth active:scale-95">
            <span className="text-white/60 text-xl">←</span>
          </button>
          <h2 className="text-white font-medium tracking-wide">Long Term Goals</h2>
          <div className="w-10" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5">
          <div className="w-14 h-14 rounded-full bg-amber-400/10 flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <circle cx="13" cy="13" r="9" stroke="rgba(251,191,36,0.7)" strokeWidth="1.6"/>
              <circle cx="13" cy="13" r="5.5" stroke="rgba(251,191,36,0.7)" strokeWidth="1.6" opacity="0.6"/>
              <circle cx="13" cy="13" r="2.5" fill="rgba(251,191,36,0.7)"/>
            </svg>
          </div>
          <div className="space-y-2">
            <p className="text-white font-medium">No goals yet</p>
            <p className="text-white/40 text-sm leading-relaxed">
              Want Faith to help you define what you're working toward? She'll ask a few questions to get the big picture.
            </p>
          </div>
          <button
            onClick={onOpenChat}
            className="px-6 py-3 rounded-2xl text-sm font-medium transition-smooth active:scale-95"
            style={{ backgroundColor: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}
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
        <h2 className="text-white font-medium tracking-wide">Long Term Goals</h2>
        <button
          onClick={() => setShowInput(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-400 transition-smooth active:scale-95"
          aria-label="Add goal"
        >
          <span className="text-white text-xl font-light">+</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scroll-momentum px-4 pt-5 pb-8 space-y-6">
        {/* Add goal input */}
        {showInput && (
          <div className="bg-[#111] border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3 animate-slide-up">
            <input
              ref={inputRef}
              type="text"
              placeholder="New goal..."
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddGoal();
                if (e.key === 'Escape') { setShowInput(false); setNewGoalTitle(''); }
              }}
              className="flex-1 bg-transparent text-white text-sm placeholder-white/25"
            />
            <button
              onClick={handleAddGoal}
              className="text-blue-400 text-sm font-medium hover:text-blue-300"
            >
              Add
            </button>
            <button
              onClick={() => { setShowInput(false); setNewGoalTitle(''); }}
              className="text-white/30 text-sm hover:text-white/50"
            >
              ✕
            </button>
          </div>
        )}

        {/* In Progress */}
        <div>
          <p className="text-white/40 text-xs tracking-widest uppercase mb-3 px-1">In Progress</p>
          {inProgress.length === 0 ? (
            <div className="bg-[#111] border border-white/5 rounded-2xl px-4 py-5 text-center">
              <p className="text-white/30 text-sm">All goals achieved! Add new ones. 🎯</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inProgress.map((goal) => (
                <GoalRow
                  key={goal.id}
                  goal={goal}
                  onToggle={() => handleToggle(goal.id)}
                  onDelete={() => handleDelete(goal.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Completed */}
        {completed.length > 0 && (
          <div>
            <p className="text-white/40 text-xs tracking-widest uppercase mb-3 px-1">Achieved</p>
            <div className="space-y-3">
              {completed.map((goal) => (
                <GoalRow
                  key={goal.id}
                  goal={goal}
                  onToggle={() => handleToggle(goal.id)}
                  onDelete={() => handleDelete(goal.id)}
                />
              ))}
            </div>
          </div>
        )}

        {goals.length === 0 && !showInput && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <p className="text-4xl">🎯</p>
            <p className="text-white/40 text-sm leading-relaxed px-8">
              Set your big goals here. These are the things that matter most.
            </p>
            <button
              onClick={() => setShowInput(true)}
              className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-2xl text-sm font-medium transition-smooth active:scale-95 mt-2"
            >
              Add First Goal
            </button>
          </div>
        )}
      </div>

      {/* Add more footer */}
      <div className="shrink-0 px-4 py-3 border-t border-white/5">
        <button
          onClick={onOpenChat}
          className="w-full py-2.5 rounded-2xl text-sm font-medium text-amber-400/70 hover:text-amber-400 bg-amber-400/5 hover:bg-amber-400/10 transition-smooth active:scale-95"
        >
          + Ask Faith to add more
        </button>
      </div>
    </div>
  );
}

function GoalRow({
  goal,
  onToggle,
  onDelete,
}: {
  goal: Goal;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      className="bg-[#111] border border-white/5 rounded-2xl px-4 py-4 flex items-center gap-4 active:border-white/10 transition-smooth"
      onClick={() => setShowDelete(!showDelete)}
    >
      {/* Circle checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-smooth active:scale-90"
        style={{
          borderColor: goal.completed ? '#d4af37' : 'rgba(255,255,255,0.2)',
          backgroundColor: goal.completed ? '#d4af37' : 'transparent',
        }}
        aria-label={goal.completed ? 'Mark in progress' : 'Mark achieved'}
      >
        {goal.completed && (
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
            <path
              d="M1 4.5L4 7.5L10 1"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Goal title */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium leading-snug transition-smooth"
          style={{
            color: goal.completed ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.9)',
            textDecoration: goal.completed ? 'line-through' : 'none',
          }}
        >
          {goal.title}
        </p>
        {goal.completed && (
          <p className="text-[#d4af37] text-xs mt-0.5">Achieved ✨</p>
        )}
      </div>

      {/* Delete button */}
      {showDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="shrink-0 w-8 h-8 flex items-center justify-center text-red-400/60 hover:text-red-400 transition-smooth"
          aria-label="Delete goal"
        >
          ✕
        </button>
      )}
    </div>
  );
}
