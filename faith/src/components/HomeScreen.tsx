'use client';

import { useState, useEffect } from 'react';
import InstallBanner from './InstallBanner';

type View = 'chat' | 'calendar' | 'tasks' | 'goals' | 'settings';

interface HomeScreenProps {
  onNavigate: (view: View) => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning, Caiden';
  if (hour < 17) return 'Good afternoon, Caiden';
  return 'Good evening, Caiden';
}

const tiles: {
  id: View;
  label: string;
  description: string;
  color: string;
  glow: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'chat',
    label: 'Claude',
    description: 'Open Claude AI',
    color: '#e8865a',
    glow: 'rgba(232,134,90,0.25)',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M6 8a3 3 0 013-3h14a3 3 0 013 3v10a3 3 0 01-3 3H18l-5 4v-4H9a3 3 0 01-3-3V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
        <circle cx="11" cy="13" r="1.2" fill="currentColor"/>
        <circle cx="16" cy="13" r="1.2" fill="currentColor"/>
        <circle cx="21" cy="13" r="1.2" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'calendar',
    label: 'Calendar',
    description: 'Your schedule',
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.25)',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="5" y="7" width="22" height="20" rx="3" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M5 13h22" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M11 5v4M21 5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <rect x="10" y="17" width="4" height="4" rx="1" fill="currentColor" opacity="0.7"/>
        <rect x="18" y="17" width="4" height="4" rx="1" fill="currentColor" opacity="0.4"/>
      </svg>
    ),
  },
  {
    id: 'tasks',
    label: 'Daily Tasks',
    description: "Today's list",
    color: '#34d399',
    glow: 'rgba(52,211,153,0.25)',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M12 9h12M12 16h12M12 23h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M7 7.5l1.5 1.5L12 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 14.5l1.5 1.5L12 12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 21.5l1.5 1.5L12 19.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'goals',
    label: 'Long Term Goals',
    description: 'The big picture',
    color: '#fbbf24',
    glow: 'rgba(251,191,36,0.25)',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.8"/>
        <circle cx="16" cy="16" r="6" stroke="currentColor" strokeWidth="1.8" opacity="0.6"/>
        <circle cx="16" cy="16" r="2.5" fill="currentColor"/>
      </svg>
    ),
  },
];

export default function HomeScreen({ onNavigate }: HomeScreenProps) {
  const [greeting, setGreeting] = useState(getGreeting());
  const [mounted, setMounted] = useState(false);
  const [pressedTile, setPressedTile] = useState<View | null>(null);

  useEffect(() => {
    setMounted(true);
    setGreeting(getGreeting());
    const interval = setInterval(() => setGreeting(getGreeting()), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleTilePress = (id: View) => {
    setPressedTile(id);
    setTimeout(() => {
      setPressedTile(null);
      if (id === 'chat') {
        window.open('https://claude.ai', '_blank');
      } else {
        onNavigate(id);
      }
    }, 180);
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col pt-safe overflow-hidden no-select">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-2">
        <div className="w-10" />
        <h1 className="faith-wordmark text-3xl text-white tracking-widest">Faith</h1>
        <button
          onClick={() => onNavigate('settings')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#111] border border-white/5 hover:border-white/10 transition-smooth active:scale-95"
          aria-label="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="12" r="3" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
          </svg>
        </button>
      </div>

      {/* 2x2 Tile Grid */}
      <div className="flex-1 px-4 pb-4 pt-6">
        <div className="grid grid-cols-2 gap-3 h-full max-h-[480px]">
          {tiles.map((tile) => {
            const isPressed = pressedTile === tile.id;
            return (
              <button
                key={tile.id}
                onPointerDown={() => setPressedTile(tile.id)}
                onPointerUp={() => handleTilePress(tile.id)}
                onPointerLeave={() => setPressedTile(null)}
                className="relative flex flex-col items-center justify-center gap-4 rounded-2xl overflow-hidden"
                style={{
                  minHeight: '150px',
                  background: isPressed
                    ? `radial-gradient(circle at center, ${tile.glow}, #111 70%)`
                    : '#111',
                  border: `1px solid ${isPressed ? tile.color + '50' : 'rgba(255,255,255,0.05)'}`,
                  transform: isPressed ? 'scale(0.96)' : 'scale(1)',
                  transition: 'transform 0.15s cubic-bezier(0.4,0,0.2,1), background 0.15s ease, border-color 0.15s ease',
                  boxShadow: isPressed ? `0 0 24px ${tile.glow}` : 'none',
                }}
                aria-label={tile.label}
              >
                {/* Icon */}
                <div
                  style={{
                    color: isPressed ? tile.color : 'rgba(255,255,255,0.7)',
                    transform: isPressed ? 'scale(1.1)' : 'scale(1)',
                    transition: 'color 0.15s ease, transform 0.15s cubic-bezier(0.4,0,0.2,1)',
                  }}
                >
                  {tile.icon}
                </div>

                {/* Label */}
                <p
                  className="text-sm font-medium tracking-wide"
                  style={{
                    color: isPressed ? tile.color : 'white',
                    transition: 'color 0.15s ease',
                  }}
                >
                  {tile.label}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom */}
      <div className="pb-safe">
        <InstallBanner />
      </div>
    </div>
  );
}
