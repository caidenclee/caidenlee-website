'use client';

import { useState, useRef, useEffect } from 'react';
import { requestPermission } from '@/lib/notifications';
import { addMemory } from '@/lib/memory';

interface OnboardingProps {
  onComplete: () => void;
}

interface OnbMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const savedStep = typeof window !== 'undefined'
    ? parseInt(localStorage.getItem('faith_onboarding_step') || '0', 10)
    : 0;
  const [step, setStep] = useState(savedStep);
  const [animating, setAnimating] = useState(false);

  // Clear saved step on mount after restoring
  useEffect(() => {
    localStorage.removeItem('faith_onboarding_step');
  }, []);

  // Step 1 state
  const [notifGranted, setNotifGranted] = useState(false);

  // Routine tasks state
  const [routineInput, setRoutineInput] = useState('');
  const [routineTasks, setRoutineTasks] = useState<string[]>([]);
  const routineInputRef = useRef<HTMLInputElement>(null);


  // Step 6 — AI chat state
  const [onbMessages, setOnbMessages] = useState<OnbMessage[]>([]);
  const [onbInput, setOnbInput] = useState('');
  const [onbStreaming, setOnbStreaming] = useState(false);
  const [onbListening, setOnbListening] = useState(false);
  const [onbStarted, setOnbStarted] = useState(false);
  const onbEndRef = useRef<HTMLDivElement>(null);
  const onbRecognitionRef = useRef<SpeechRecognition | null>(null);
  const onbMessagesRef = useRef<OnbMessage[]>([]);

  useEffect(() => {
    onbMessagesRef.current = onbMessages;
  }, [onbMessages]);

  // Trigger Faith's first question when step 6 is reached
  useEffect(() => {
    if (step === 5 && !onbStarted) {
      setOnbStarted(true);
      sendOnbMessage(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const sendOnbMessage = async (content: string | null) => {
    if (onbStreaming) return;

    const currentMessages = onbMessagesRef.current;
    let newMessages = [...currentMessages];

    if (content && content.trim()) {
      newMessages = [...newMessages, { role: 'user' as const, content: content.trim() }];
      setOnbMessages(newMessages);
      setOnbInput('');
    }

    setOnbStreaming(true);
    setOnbMessages((prev) => [...prev, { role: 'assistant' as const, content: '' }]);

    try {
      const res = await fetch('/api/onboarding/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok || !res.body) throw new Error('Failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullText += parsed.text;
                setOnbMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: fullText };
                  return updated;
                });
              }
            } catch { /* skip */ }
          }
        }
      }
    } catch {
      setOnbMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: "Having trouble connecting — try again!" };
        return updated;
      });
    } finally {
      setOnbStreaming(false);
      setTimeout(() => onbEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const startOnbListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRec =
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition ||
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition;
    if (!SpeechRec) return;

    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onstart = () => setOnbListening(true);
    recognition.onend = () => { setOnbListening(false); onbRecognitionRef.current = null; };
    recognition.onerror = () => { setOnbListening(false); onbRecognitionRef.current = null; };
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results).map((r) => r[0].transcript).join('');
      setOnbInput(transcript);
      if (event.results[0].isFinal) {
        sendOnbMessage(transcript);
        setOnbInput('');
      }
    };
    onbRecognitionRef.current = recognition;
    recognition.start();
  };

  const stopOnbListening = () => {
    onbRecognitionRef.current?.stop();
    setOnbListening(false);
  };

  const goNext = () => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => s + 1);
      setAnimating(false);
    }, 200);
  };

  const handleComplete = () => {
    if (typeof window === 'undefined') return;

    // Save onboarding conversation as memory
    if (onbMessages.length > 0) {
      const userAnswers = onbMessages
        .filter((m) => m.role === 'user')
        .map((m) => m.content)
        .join(' | ');
      if (userAnswers) {
        localStorage.setItem('faith_onboarding_chat', JSON.stringify(onbMessages));
        addMemory('Personal Background', `Onboarding conversation: ${userAnswers.slice(0, 400)}`);
      }
    }

    localStorage.setItem('ONBOARDING_COMPLETE', 'true');
    onComplete();
  };

  const addRoutineTask = () => {
    if (!routineInput.trim()) return;
    setRoutineTasks((prev) => [...prev, routineInput.trim()]);
    setRoutineInput('');
    routineInputRef.current?.focus();
  };

  const userMessageCount = onbMessages.filter((m) => m.role === 'user').length;

  const steps = [
    // Step 0 — Welcome
    <div key="welcome" className="onboarding-slide flex flex-col items-center justify-center flex-1 px-8 text-center gap-6">
      <div className="space-y-3">
        <h1 className="text-white text-4xl font-semibold tracking-tight">Hi, I'm Faith.</h1>
        <p className="text-white/50 text-sm">Your personal assistant.</p>
      </div>
      <button
        onClick={goNext}
        className="w-full max-w-xs py-4 bg-blue-500 hover:bg-blue-400 text-white rounded-2xl font-medium text-sm transition-smooth active:scale-95 mt-4"
      >
        Let's go
      </button>
    </div>,

    // Step 1 — Notifications
    <div key="notifications" className="onboarding-slide flex flex-col items-center justify-center flex-1 px-8 text-center gap-6">
      <div className="text-5xl">🔔</div>
      <div className="space-y-3">
        <h2 className="text-white text-2xl font-light">Stay in the loop</h2>
        <p className="text-white/60 text-sm leading-relaxed">
          Mind if I send you reminders? I promise I won't spam you — just the important stuff.
        </p>
      </div>
      {notifGranted && <p className="text-blue-400 text-sm">Notifications enabled</p>}
      <div className="w-full max-w-xs space-y-3 mt-2">
        <button
          onClick={async () => {
            const result = await requestPermission();
            if (result === 'granted') setNotifGranted(true);
            goNext();
          }}
          className="w-full py-4 bg-blue-500 hover:bg-blue-400 text-white rounded-2xl font-medium text-sm transition-smooth active:scale-95"
        >
          Enable Notifications
        </button>
        <button
          onClick={goNext}
          className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/60 rounded-2xl font-medium text-sm transition-smooth active:scale-95"
        >
          Skip for now
        </button>
      </div>
    </div>,

    // Step 2 — Google Calendar
    <div key="calendar" className="onboarding-slide flex flex-col items-center justify-center flex-1 px-8 text-center gap-6">
      <div className="text-5xl">🗓️</div>
      <div className="space-y-3">
        <h2 className="text-white text-2xl font-light">Your schedule</h2>
        <p className="text-white/60 text-sm leading-relaxed">
          Connect your Google Calendar so I can see your schedule and add events for you in real time.
        </p>
      </div>
      <div className="w-full max-w-xs space-y-3 mt-2">
        <a
          href="/api/google/auth"
          onClick={() => localStorage.setItem('faith_onboarding_step', '3')}
          className="block w-full py-4 bg-blue-500 hover:bg-blue-400 text-white rounded-2xl font-medium text-sm text-center transition-smooth active:scale-95"
        >
          Connect Calendar
        </a>
        <button
          onClick={goNext}
          className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/60 rounded-2xl font-medium text-sm transition-smooth active:scale-95"
        >
          Skip for now
        </button>
      </div>
    </div>,

    // Step 3 — Google Tasks
    <div key="tasks" className="onboarding-slide flex flex-col items-center justify-center flex-1 px-8 text-center gap-6">
      <div className="text-5xl">✅</div>
      <div className="space-y-3">
        <h2 className="text-white text-2xl font-light">Sync your tasks</h2>
        <p className="text-white/60 text-sm leading-relaxed">
          Connect Google Tasks and your reminders will sync directly to Apple Reminders on your iPhone.
        </p>
      </div>
      <div className="w-full max-w-xs space-y-3 mt-2">
        <a
          href="/api/google/auth"
          onClick={() => localStorage.setItem('faith_onboarding_step', '4')}
          className="block w-full py-4 bg-blue-500 hover:bg-blue-400 text-white rounded-2xl font-medium text-sm text-center transition-smooth active:scale-95"
        >
          Connect Google Tasks
        </a>
        <button
          onClick={goNext}
          className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/60 rounded-2xl font-medium text-sm transition-smooth active:scale-95"
        >
          Skip for now
        </button>
      </div>
    </div>,

    // Step 4 — Apple Notes
    <div key="apple-notes" className="onboarding-slide flex flex-col items-center justify-center flex-1 px-8 text-center gap-6">
      <div className="text-5xl">📝</div>
      <div className="space-y-3">
        <h2 className="text-white text-2xl font-light">Apple Notes</h2>
        <p className="text-white/60 text-sm leading-relaxed">
          Apple Notes doesn't have a public API, but I've got a workaround. Install this Apple Shortcut and I'll be able to send notes straight to your iPhone with one tap.
        </p>
      </div>
      <div className="w-full max-w-xs space-y-3 mt-2">
        <a
          href="https://www.icloud.com/shortcuts/"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-4 bg-[#d4af37] hover:bg-[#c4a030] text-black rounded-2xl font-medium text-sm text-center transition-smooth active:scale-95"
        >
          Browse Shortcuts Gallery
        </a>
        <button
          onClick={goNext}
          className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/60 rounded-2xl font-medium text-sm transition-smooth active:scale-95"
        >
          Continue
        </button>
      </div>
    </div>,

    // Step 5 — AI-powered get to know you
    <div key="get-to-know" className="onboarding-slide flex flex-col flex-1 overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-momentum">
        {onbMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-[#1a1a1a] text-white rounded-tr-sm'
                  : 'bg-[#1a1a2e] text-white/90 rounded-tl-sm'
              }`}
            >
              {msg.content || (
                <span className="inline-flex gap-1 py-1">
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={onbEndRef} />
      </div>

      {/* Continue button — appears after 3 answers */}
      {userMessageCount >= 3 && (
        <div className="px-4 pb-2 shrink-0">
          <button
            onClick={goNext}
            className="w-full py-3 bg-white/5 border border-white/10 text-white/60 rounded-2xl text-sm font-medium hover:bg-white/10 transition-smooth"
          >
            That's enough, let's continue →
          </button>
        </div>
      )}

      {/* Input bar */}
      <div
        className="shrink-0 border-t border-white/5 bg-[#0a0a0a] px-4 py-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-end gap-2">
          <textarea
            value={onbInput}
            onChange={(e) => setOnbInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendOnbMessage(onbInput);
              }
            }}
            placeholder="Reply to Faith..."
            rows={1}
            className="flex-1 bg-[#111] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder-white/25 resize-none focus:border-white/20 transition-smooth"
            style={{ minHeight: '44px', maxHeight: '120px', overflowY: 'auto' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={onbListening ? stopOnbListening : startOnbListening}
            className={`w-11 h-11 flex items-center justify-center rounded-full border transition-smooth shrink-0 active:scale-95 ${
              onbListening
                ? 'bg-blue-500 border-blue-400 mic-listening'
                : 'bg-[#111] border-white/10 hover:border-white/20'
            }`}
          >
            <span className="text-lg">{onbListening ? '🔴' : '🎙️'}</span>
          </button>
          <button
            onClick={() => sendOnbMessage(onbInput)}
            disabled={!onbInput.trim() || onbStreaming}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-400 disabled:opacity-30 disabled:cursor-not-allowed transition-smooth shrink-0 active:scale-95"
          >
            <span className="text-sm">↑</span>
          </button>
        </div>
      </div>
    </div>,

    // Step 7 — All Set
    <div key="all-set" className="onboarding-slide flex flex-col items-center justify-center flex-1 px-8 text-center gap-6">
      <div className="space-y-4">
        <h2 className="text-white text-2xl font-light">You're all set, Caiden.</h2>
        <p className="text-white/60 text-sm leading-relaxed">
          I've got a good sense of who you are. Let's get to work.
        </p>
      </div>
      <button
        onClick={handleComplete}
        className="w-full max-w-xs py-4 bg-blue-500 hover:bg-blue-400 text-white rounded-2xl font-semibold text-sm transition-smooth active:scale-95 mt-4"
      >
        Get Started
      </button>
    </div>,
  ];

  const totalSteps = steps.length;

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col overflow-hidden pt-safe">
      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 pt-6 pb-2 shrink-0">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === step ? 20 : 6,
              height: 6,
              backgroundColor:
                i === step ? '#3b82f6' : i < step ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.1)',
            }}
          />
        ))}
      </div>

      {/* Step content */}
      <div
        className="flex flex-col flex-1 overflow-hidden transition-opacity duration-200"
        style={{ opacity: animating ? 0 : 1 }}
      >
        {steps[step]}
      </div>
    </div>
  );
}
