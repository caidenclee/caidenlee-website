'use client';

import { useState, useEffect } from 'react';
import HomeScreen from '@/components/HomeScreen';
import Chat from '@/components/Chat';
import CalendarView from '@/components/CalendarView';
import DailyTasks from '@/components/DailyTasks';
import LongTermGoals from '@/components/LongTermGoals';
import Settings from '@/components/Settings';
import Onboarding from '@/components/Onboarding';
import { getMemories, Memory } from '@/lib/memory';
import { addTask } from '@/lib/tasks';
import { addGoal } from '@/lib/goals';

type View = 'home' | 'chat' | 'calendar' | 'tasks' | 'goals' | 'settings';

export default function Home() {
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [currentView, setCurrentView] = useState<View>('home');
  const [transitioning, setTransitioning] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);

  const navigateTo = (view: View) => {
    setTransitioning(true);
    setTimeout(() => {
      setCurrentView(view);
      setTransitioning(false);
    }, 150);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const complete = localStorage.getItem('ONBOARDING_COMPLETE') === 'true';
      setOnboardingComplete(complete);
      setMemories(getMemories());
    }

    // Check Google connection status
    fetch('/api/google/status')
      .then((r) => r.json())
      .then((data) => {
        setGoogleConnected(data.connected);
        // If Google is connected, mark onboarding complete automatically
        if (data.connected && typeof window !== 'undefined') {
          localStorage.setItem('ONBOARDING_COMPLETE', 'true');
          setOnboardingComplete(true);
        }
      })
      .catch(() => setGoogleConnected(false));
  }, []);

  // Handle ?google=connected redirect from OAuth
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('google') === 'connected') {
      setGoogleConnected(true);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Handle faith_action deep links from Claude
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('faith_action');
    if (!raw) return;

    try {
      const { action, payload } = JSON.parse(decodeURIComponent(raw));
      if (action === 'add_task' && payload?.title) {
        addTask(payload.title, false);
        alert(`✅ Task added: "${payload.title}"`);
      } else if (action === 'add_goal' && payload?.title) {
        addGoal(payload.title);
        alert(`🎯 Goal added: "${payload.title}"`);
      }
    } catch {
      // invalid action — ignore
    }

    window.history.replaceState({}, '', '/');
  }, []);

  const refreshMemories = () => setMemories(getMemories());

  const handleOnboardingComplete = () => {
    setOnboardingComplete(true);
    setCurrentView('home');
  };

  const handleRedoOnboarding = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ONBOARDING_COMPLETE');
    }
    setOnboardingComplete(false);
    setCurrentView('home');
  };

  // Loading splash
  if (googleConnected === null || onboardingComplete === null) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center">
        <p className="faith-wordmark text-3xl text-white/60">Faith</p>
      </div>
    );
  }

  // Google sign-in gate
  if (!googleConnected) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center px-8 text-center gap-8">
        <div className="space-y-3">
          <h1 className="text-white text-4xl font-semibold tracking-tight">Hi, I'm Faith.</h1>
          <p className="text-white/50 text-sm">Sign in with Google to get started.</p>
        </div>
        <a
          href="/api/google/auth"
          className="flex items-center gap-3 px-6 py-4 bg-white text-black rounded-2xl font-medium text-sm hover:bg-white/90 transition-smooth active:scale-95"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </a>
      </div>
    );
  }

  // Onboarding
  if (!onboardingComplete) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div
      className="fixed inset-0 bg-[#0a0a0a] overflow-hidden transition-opacity duration-150"
      style={{ opacity: transitioning ? 0 : 1 }}
    >
      {currentView === 'home' && (
        <HomeScreen onNavigate={(view) => navigateTo(view as View)} />
      )}
      {currentView === 'chat' && (
        <Chat
          onBack={() => { navigateTo('home'); refreshMemories(); }}
          memories={memories}
        />
      )}
      {currentView === 'calendar' && (
        <CalendarView onBack={() => navigateTo('home')} onOpenChat={() => navigateTo('chat')} />
      )}
      {currentView === 'tasks' && (
        <DailyTasks onBack={() => navigateTo('home')} onOpenChat={() => navigateTo('chat')} />
      )}
      {currentView === 'goals' && (
        <LongTermGoals onBack={() => navigateTo('home')} onOpenChat={() => navigateTo('chat')} />
      )}
      {currentView === 'settings' && (
        <Settings
          onBack={() => navigateTo('home')}
          onRedoOnboarding={handleRedoOnboarding}
        />
      )}
    </div>
  );
}
