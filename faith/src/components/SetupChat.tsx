'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface SetupChatProps {
  context: 'tasks' | 'goals' | 'calendar';
  mode?: 'setup' | 'add';
  onItemsAdded: (items: string[]) => void;
  onSkip: () => void;
}

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const CONTEXT_LABELS = {
  tasks: { title: 'Daily Tasks', color: '#34d399' },
  goals: { title: 'Long Term Goals', color: '#fbbf24' },
  calendar: { title: 'Calendar', color: '#a78bfa' },
};

function parseItems(text: string, context: string): string[] {
  const tag = context === 'tasks' ? 'ADD_TASK' : context === 'goals' ? 'ADD_GOAL' : 'ADD_EVENT';
  const regex = new RegExp(`\\[\\[${tag}:\\s*([^\\]]+)\\]\\]`, 'g');
  const items: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    items.push(match[1].trim());
  }
  return items;
}

function cleanText(text: string): string {
  return text
    .replace(/\[\[ADD_\w+:[^\]]+\]\]\n?/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .trim();
}

const NUM_BARS = 20;

export default function SetupChat({ context, mode = 'setup', onItemsAdded, onSkip }: SetupChatProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [started, setStarted] = useState(false);
  const [pendingItems, setPendingItems] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(NUM_BARS).fill(0));

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<Msg[]>([]);
  const streamingRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    if (!started) {
      setStarted(true);
      sendMessage(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 150) + 'px';
    });
  }, [input]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      audioContextRef.current?.close().catch(() => {});
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const stopAudio = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    audioContextRef.current?.close().catch(() => {});
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioContextRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    setAudioLevels(Array(NUM_BARS).fill(0));
  }, []);

  const startAudioVisualizer = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.6;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;

      const animate = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const levels = Array.from({ length: NUM_BARS }, (_, i) => {
          const idx = Math.floor((i / NUM_BARS) * data.length * 0.6);
          return data[idx] / 255;
        });
        setAudioLevels(levels);
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
    } catch {
      const animate = () => {
        setAudioLevels(Array(NUM_BARS).fill(0).map(() => Math.random() * 0.5 + 0.1));
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
    }
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRec =
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition ||
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition;
    if (!SpeechRec) return;

    const recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      startAudioVisualizer();
    };
    recognition.onend = () => {
      setIsListening(false);
      stopAudio();
      recognitionRef.current = null;
    };
    recognition.onerror = () => {
      setIsListening(false);
      stopAudio();
      recognitionRef.current = null;
    };
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results).map((r) => r[0].transcript).join('');
      if (event.results[event.results.length - 1].isFinal) {
        setInput(transcript);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [startAudioVisualizer, stopAudio]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    stopAudio();
  }, [stopAudio]);

  const sendMessage = async (content: string | null) => {
    if (streamingRef.current) return;
    streamingRef.current = true;

    const current = messagesRef.current;
    let newMessages = [...current];

    if (content && content.trim()) {
      newMessages = [...newMessages, { role: 'user' as const, content: content.trim() }];
      setMessages(newMessages);
      setInput('');
    }

    setStreaming(true);
    setMessages((prev) => [...prev, { role: 'assistant' as const, content: '' }]);

    try {
      const res = await fetch('/api/setup/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, context, mode }),
      });

      const reader = res.body!.getReader();
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
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: cleanText(fullText) };
                  return updated;
                });
              }
            } catch { /* skip */ }
          }
        }
      }

      // Parse items from response — queue for confirmation, don't add yet
      const items = parseItems(fullText, context);
      if (items.length > 0) {
        setPendingItems(items);
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'Having trouble connecting — try again!' };
        return updated;
      });
    } finally {
      streamingRef.current = false;
      setStreaming(false);
    }
  };

  const label = CONTEXT_LABELS[context];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto scroll-momentum px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[85%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap rounded-[20px] ${
                msg.role === 'user'
                  ? 'bg-[#3b82f6] text-white rounded-br-[5px]'
                  : 'bg-[#1c1c1e] text-white/90 rounded-bl-[5px]'
              }`}
            >
              {msg.content || (
                <span className="inline-flex gap-1 py-0.5">
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Confirmation card — shown before adding */}
        {pendingItems.length > 0 && (
          <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-4 space-y-3 animate-slide-up">
            <p className="text-white/50 text-xs uppercase tracking-widest">Ready to add</p>
            <div className="space-y-2">
              {pendingItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                  <p className="text-white/80 text-sm">{item.split('|')[0].trim()}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  onItemsAdded(pendingItems);
                  onSkip();
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-smooth active:scale-95"
                style={{ backgroundColor: label.color + '20', color: label.color }}
              >
                Add these
              </button>
              <button
                onClick={() => setPendingItems([])}
                className="px-4 py-2.5 rounded-xl text-sm text-white/30 hover:text-white/50 transition-smooth"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      {pendingItems.length === 0 && (
        <div
          className="shrink-0 px-3 py-2 bg-[#0a0a0a]"
          style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
        >
          {isListening ? (
            <div
              className="flex flex-col items-center gap-3 bg-[#1c1c1e] rounded-[26px] px-4 py-4"
              onClick={stopListening}
            >
              <div className="flex items-center gap-[3px] h-8">
                {audioLevels.map((level, i) => (
                  <div
                    key={i}
                    className="rounded-full transition-all duration-75"
                    style={{
                      width: '3px',
                      height: `${Math.max(4, level * 28)}px`,
                      backgroundColor: label.color,
                      opacity: 0.5 + level * 0.5,
                    }}
                  />
                ))}
              </div>
              <p className="text-white/25 text-xs">Tap to stop</p>
            </div>
          ) : (
            <div className="flex items-end gap-2 bg-[#1c1c1e] rounded-[26px] px-3 py-2">
              <button
                onClick={startListening}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-smooth shrink-0 active:scale-95 hover:bg-white/10"
                aria-label="Voice input"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="5" y="1" width="6" height="8" rx="3" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
                  <path d="M2 7c0 3.314 2.686 5 6 5s6-1.686 6-5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="8" y1="12" x2="8" y2="15" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
                }}
                placeholder="Reply to Faith..."
                rows={1}
                className="flex-1 bg-transparent text-white text-sm placeholder-white/25 resize-none focus:outline-none py-1.5"
                style={{ minHeight: '28px', maxHeight: '150px', overflowY: 'auto' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || streaming}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#3b82f6] hover:bg-blue-400 disabled:opacity-0 transition-all shrink-0 active:scale-95"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 11V3M7 3L3.5 6.5M7 3L10.5 6.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}
          <button onClick={onSkip} className="w-full mt-2 text-white/25 text-xs py-1">
            Skip for now
          </button>
        </div>
      )}
    </div>
  );
}
