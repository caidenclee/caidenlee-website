'use client';

import { useState, useEffect } from 'react';
import {
  getMemories,
  deleteMemory,
  clearAllMemories,
  Memory,
  MEMORY_CATEGORIES,
  MemoryCategory,
} from '@/lib/memory';

interface SettingsProps {
  onBack: () => void;
  onRedoOnboarding: () => void;
}

export default function Settings({ onBack, onRedoOnboarding }: SettingsProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [notifStatus, setNotifStatus] = useState<string>('unknown');
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [checkingGoogle, setCheckingGoogle] = useState(true);

  useEffect(() => {
    setMemories(getMemories());

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifStatus(Notification.permission);
    } else {
      setNotifStatus('not-supported');
    }

    checkGoogleConnection();
  }, []);

  async function checkGoogleConnection() {
    try {
      const res = await fetch('/api/google/calendar?timeMin=' + new Date().toISOString());
      setIsGoogleConnected(res.status !== 401);
    } catch {
      setIsGoogleConnected(false);
    } finally {
      setCheckingGoogle(false);
    }
  }

  const handleDeleteMemory = (id: string) => {
    deleteMemory(id);
    setMemories(getMemories());
  };

  const handleClearAll = () => {
    clearAllMemories();
    setMemories([]);
    setShowClearConfirm(false);
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm('Disconnect Google Calendar and Tasks?')) return;
    // Clear cookies by calling a custom endpoint or just inform user
    // Since we can't clear httpOnly cookies from the client, direct to disconnect flow
    try {
      await fetch('/api/google/auth?disconnect=true');
    } catch {
      // ignore
    }
    setIsGoogleConnected(false);
  };

  const handleRedoOnboarding = () => {
    if (confirm('This will restart the setup process. Continue?')) {
      onRedoOnboarding();
    }
  };

  // Group memories by category
  const grouped: Partial<Record<MemoryCategory, Memory[]>> = {};
  for (const mem of memories) {
    if (!grouped[mem.category]) grouped[mem.category] = [];
    grouped[mem.category]!.push(mem);
  }

  const notifLabel =
    notifStatus === 'granted'
      ? 'Enabled ✓'
      : notifStatus === 'denied'
      ? 'Blocked'
      : notifStatus === 'not-supported'
      ? 'Not supported'
      : 'Not enabled';

  const notifColor =
    notifStatus === 'granted' ? '#3b82f6' : 'rgba(255,255,255,0.3)';

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
        <h2 className="text-white font-medium tracking-wide">Settings</h2>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scroll-momentum px-4 pt-5 pb-12 space-y-6">
        {/* Memory Section */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-white/40 text-xs tracking-widest uppercase">Memory</p>
            {memories.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-red-400/60 text-xs hover:text-red-400 transition-smooth"
              >
                Clear all
              </button>
            )}
          </div>

          {memories.length === 0 ? (
            <div className="bg-[#111] border border-white/5 rounded-2xl px-4 py-5 text-center">
              <p className="text-white/30 text-sm">No memories saved yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {MEMORY_CATEGORIES.map((category) => {
                const catMems = grouped[category];
                if (!catMems || catMems.length === 0) return null;
                return (
                  <div key={category}>
                    <p className="text-white/30 text-xs px-1 mb-2">{category}</p>
                    <div className="space-y-1.5">
                      {catMems.map((mem) => (
                        <div
                          key={mem.id}
                          className="bg-[#111] border border-white/5 rounded-xl px-4 py-3 flex items-start justify-between gap-3"
                        >
                          <p className="text-white/70 text-xs leading-relaxed flex-1">
                            {mem.content}
                          </p>
                          <button
                            onClick={() => handleDeleteMemory(mem.id)}
                            className="shrink-0 text-white/20 hover:text-red-400 transition-smooth text-sm mt-0.5"
                            aria-label="Delete memory"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Google Calendar Section */}
        <section>
          <p className="text-white/40 text-xs tracking-widest uppercase mb-3 px-1">
            Google Calendar
          </p>
          <div className="bg-[#111] border border-white/5 rounded-2xl px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">
                  {checkingGoogle ? 'Checking...' : isGoogleConnected ? 'Connected' : 'Not connected'}
                </p>
                <p className="text-white/30 text-xs mt-0.5">
                  {isGoogleConnected
                    ? 'Calendar and Tasks synced'
                    : 'Connect to sync your schedule'}
                </p>
              </div>
              {!checkingGoogle && (
                isGoogleConnected ? (
                  <button
                    onClick={handleDisconnectGoogle}
                    className="text-red-400/60 text-xs hover:text-red-400 transition-smooth px-3 py-1.5 bg-red-500/10 rounded-lg"
                  >
                    Disconnect
                  </button>
                ) : (
                  <a
                    href="/api/google/auth"
                    className="text-blue-400 text-xs hover:text-blue-300 transition-smooth px-3 py-1.5 bg-blue-500/10 rounded-lg"
                  >
                    Connect
                  </a>
                )
              )}
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section>
          <p className="text-white/40 text-xs tracking-widest uppercase mb-3 px-1">
            Notifications
          </p>
          <div className="bg-[#111] border border-white/5 rounded-2xl px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">Push Notifications</p>
                <p className="text-xs mt-0.5" style={{ color: notifColor }}>
                  {notifLabel}
                </p>
              </div>
              {notifStatus !== 'granted' && notifStatus !== 'denied' && (
                <button
                  onClick={async () => {
                    const result = await (await import('@/lib/notifications')).requestPermission();
                    setNotifStatus(result);
                  }}
                  className="text-blue-400 text-xs hover:text-blue-300 px-3 py-1.5 bg-blue-500/10 rounded-lg"
                >
                  Enable
                </button>
              )}
              {notifStatus === 'denied' && (
                <p className="text-white/20 text-xs">Enable in iOS Settings</p>
              )}
            </div>
          </div>
        </section>

        {/* Redo Onboarding */}
        <section>
          <p className="text-white/40 text-xs tracking-widest uppercase mb-3 px-1">
            Setup
          </p>
          <button
            onClick={handleRedoOnboarding}
            className="w-full bg-[#111] border border-white/5 rounded-2xl px-4 py-4 text-left flex items-center justify-between hover:border-white/10 transition-smooth active:scale-[0.99]"
          >
            <div>
              <p className="text-white text-sm font-medium">Redo Onboarding</p>
              <p className="text-white/30 text-xs mt-0.5">Restart the setup process</p>
            </div>
            <span className="text-white/20 text-lg">→</span>
          </button>
        </section>

        {/* App Info */}
        <section className="text-center pt-4">
          <p className="faith-wordmark text-2xl text-white/20 tracking-widest mb-1">Faith</p>
          <p className="text-white/15 text-xs">Built for Caiden Lee</p>
        </section>
      </div>

      {/* Clear All Confirm Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-8">
          <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-3xl p-6 text-center space-y-4">
            <p className="text-white font-medium">Clear all memory?</p>
            <p className="text-white/50 text-sm leading-relaxed">
              I'll forget everything I've learned about you. You can always rebuild it by chatting.
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/60 rounded-2xl text-sm transition-smooth"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-2xl text-sm font-medium transition-smooth"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
