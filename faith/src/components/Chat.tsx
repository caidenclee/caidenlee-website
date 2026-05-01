'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Memory, getMemoriesAsContext, addMemory } from '@/lib/memory';
import { getTodaysTasks, addTask, toggleTask, deleteTask } from '@/lib/tasks';
import { getGoals, addGoal, toggleGoal, deleteGoal } from '@/lib/goals';
import { loadHistory, saveHistory, getHistoryForContext } from '@/lib/history';
import { getContactsAsContext, saveContact, findContact } from '@/lib/contacts';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ActionChip {
  type: 'calendar' | 'task' | 'memory';
  label: string;
}

interface ChatProps {
  onBack: () => void;
  memories: Memory[];
}

type ActionType = 'add_task' | 'task_done' | 'delete_task' | 'add_goal' | 'goal_done' | 'delete_goal' | 'cal_add' | 'cal_delete' | 'gmail_send' | 'gmail_reply' | 'sms_send' | 'save_contact' | 'create_doc';

interface PendingAction {
  type: ActionType;
  label: string;
  subtitle?: string;
  raw: Record<string, string>;
}

function buildRRule(repeat: string): string[] {
  const r = repeat.toLowerCase().trim();
  if (!r || r === 'none') return [];
  if (r === 'daily') return ['RRULE:FREQ=DAILY'];
  if (r === 'weekly') return ['RRULE:FREQ=WEEKLY'];
  if (r === 'weekdays') return ['RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'];
  const wdUntil = r.match(/weekdays\s+until\s+(\d{4}-\d{2}-\d{2})/);
  if (wdUntil) return [`RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=${wdUntil[1].replace(/-/g, '')}T000000Z`];
  const wkUntil = r.match(/weekly\s+until\s+(\d{4}-\d{2}-\d{2})/);
  if (wkUntil) return [`RRULE:FREQ=WEEKLY;UNTIL=${wkUntil[1].replace(/-/g, '')}T000000Z`];
  const dyUntil = r.match(/daily\s+until\s+(\d{4}-\d{2}-\d{2})/);
  if (dyUntil) return [`RRULE:FREQ=DAILY;UNTIL=${dyUntil[1].replace(/-/g, '')}T000000Z`];
  return [];
}

function parseTag(text: string, tag: string): string[] {
  const regex = new RegExp(`\\[\\[${tag}:\\s*([^\\]]+)\\]\\]`, 'g');
  const results: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) results.push(match[1].trim());
  return results;
}

function parseAllActions(text: string): PendingAction[] {
  const actions: PendingAction[] = [];

  parseTag(text, 'ADD_TASK').forEach((title) =>
    actions.push({ type: 'add_task', label: title, subtitle: 'Add to Daily Tasks', raw: { title } })
  );
  parseTag(text, 'TASK_DONE').forEach((title) =>
    actions.push({ type: 'task_done', label: title, subtitle: 'Mark complete', raw: { title } })
  );
  parseTag(text, 'DELETE_TASK').forEach((title) =>
    actions.push({ type: 'delete_task', label: title, subtitle: 'Delete task', raw: { title } })
  );
  parseTag(text, 'ADD_GOAL').forEach((title) =>
    actions.push({ type: 'add_goal', label: title, subtitle: 'Add to Long-Term Goals', raw: { title } })
  );
  parseTag(text, 'GOAL_DONE').forEach((title) =>
    actions.push({ type: 'goal_done', label: title, subtitle: 'Mark achieved', raw: { title } })
  );
  parseTag(text, 'DELETE_GOAL').forEach((title) =>
    actions.push({ type: 'delete_goal', label: title, subtitle: 'Delete goal', raw: { title } })
  );

  parseTag(text, 'CAL_DELETE').forEach((title) =>
    actions.push({ type: 'cal_delete', label: title, subtitle: 'Remove from Google Calendar', raw: { title } })
  );

  // SMS_SEND: name/number | message
  const smsRegex = /\[\[SMS_SEND:\s*([^\]]+)\]\]/g;
  let sm;
  while ((sm = smsRegex.exec(text)) !== null) {
    const parts = sm[1].split('|').map((s) => s.trim());
    if (parts.length >= 2) {
      const [to, ...msgParts] = parts;
      const message = msgParts.join(' | ');
      actions.push({
        type: 'sms_send',
        label: `Text to ${to}`,
        subtitle: message.slice(0, 80),
        raw: { to, message },
      });
    }
  }

  // SAVE_CONTACT: name | phone
  const contactRegex = /\[\[SAVE_CONTACT:\s*([^\]]+)\]\]/g;
  let sc;
  while ((sc = contactRegex.exec(text)) !== null) {
    const parts = sc[1].split('|').map((s) => s.trim());
    if (parts.length >= 2) {
      const [name, phone] = parts;
      actions.push({
        type: 'save_contact',
        label: name,
        subtitle: phone,
        raw: { name, phone },
      });
    }
  }

  // GMAIL_REPLY: messageId | body
  const gmailReplyRegex = /\[\[GMAIL_REPLY:\s*([^\]]+)\]\]/g;
  let gr;
  while ((gr = gmailReplyRegex.exec(text)) !== null) {
    const parts = gr[1].split('|').map((s) => s.trim());
    if (parts.length >= 2) {
      const [messageId, ...bodyParts] = parts;
      const body = bodyParts.join(' | ');
      actions.push({
        type: 'gmail_reply',
        label: `Reply to thread`,
        subtitle: body.slice(0, 80),
        raw: { messageId, body },
      });
    }
  }

  // CREATE_DOC: title | content
  const docRegex = /\[\[CREATE_DOC:\s*([^\]]+)\]\]/g;
  let cd;
  while ((cd = docRegex.exec(text)) !== null) {
    const pipeIdx = cd[1].indexOf('|');
    if (pipeIdx >= 0) {
      const title = cd[1].slice(0, pipeIdx).trim();
      const content = cd[1].slice(pipeIdx + 1).trim();
      actions.push({
        type: 'create_doc',
        label: title,
        subtitle: 'Save as Google Doc',
        raw: { title, content },
      });
    }
  }

  // GMAIL_SEND: to | subject | body
  const gmailRegex = /\[\[GMAIL_SEND:\s*([^\]]+)\]\]/g;
  let gm;
  while ((gm = gmailRegex.exec(text)) !== null) {
    const parts = gm[1].split('|').map((s) => s.trim());
    if (parts.length >= 3) {
      const [to, subject, ...bodyParts] = parts;
      const body = bodyParts.join(' | ');
      actions.push({
        type: 'gmail_send',
        label: `To: ${to}`,
        subtitle: `Subject: ${subject}`,
        raw: { to, subject, body },
      });
    }
  }

  // CAL_ADD: title | date | startTime | endTime | repeat
  const calRegex = /\[\[CAL_ADD:\s*([^\]]+)\]\]/g;
  let m;
  while ((m = calRegex.exec(text)) !== null) {
    const parts = m[1].split('|').map((s) => s.trim());
    if (parts.length >= 4) {
      const [title, date, startTime, endTime, repeat = 'none'] = parts;
      const fmt = (t: string) => {
        const [h, min] = t.split(':').map(Number);
        const ap = h >= 12 ? 'PM' : 'AM';
        return `${h % 12 || 12}:${String(min).padStart(2, '0')} ${ap}`;
      };
      const r = repeat.toLowerCase();
      let repeatStr = r === 'none' || !r ? date
        : r === 'daily' ? 'Every day'
        : r === 'weekly' ? 'Every week'
        : r === 'weekdays' ? 'Weekdays'
        : r.includes('weekdays until') ? `Weekdays until ${r.match(/(\d{4}-\d{2}-\d{2})/)?.[1]}`
        : r.includes('weekly until') ? `Weekly until ${r.match(/(\d{4}-\d{2}-\d{2})/)?.[1]}`
        : r.includes('daily until') ? `Daily until ${r.match(/(\d{4}-\d{2}-\d{2})/)?.[1]}`
        : date;
      actions.push({
        type: 'cal_add',
        label: title,
        subtitle: `${repeatStr}, ${fmt(startTime)} – ${fmt(endTime)}`,
        raw: { title, date, startTime, endTime, repeat },
      });
    }
  }

  return actions;
}

function cleanActionTags(text: string): string {
  return text
    .replace(/\[\[(ADD_TASK|TASK_DONE|DELETE_TASK|ADD_GOAL|GOAL_DONE|DELETE_GOAL|CAL_ADD|CAL_DELETE|GMAIL_SEND|GMAIL_REPLY|SMS_SEND|SAVE_CONTACT|CREATE_DOC):[^\]]+\]\]\n?/g, '')
    .trim();
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '');
}

function detectActions(text: string): ActionChip[] {
  const chips: ActionChip[] = [];
  const lower = text.toLowerCase();
  if (
    lower.includes("add that to your calendar") ||
    lower.includes("adding that to your calendar") ||
    (lower.includes("i'll add") && lower.includes("calendar"))
  ) {
    chips.push({ type: 'calendar', label: 'Added to Calendar' });
  }
  if (
    lower.includes("adding that to your task") ||
    lower.includes("add that to your task") ||
    (lower.includes("i'll add") && lower.includes("task"))
  ) {
    chips.push({ type: 'task', label: 'Added to Task List' });
  }
  return chips;
}

function parseMemoryTag(text: string): { clean: string; category: string; content: string } | null {
  const match = text.match(/\[\[REMEMBER:\s*([^|]+)\|\s*([^\]]+)\]\]/);
  if (!match) return null;
  const clean = text.replace(/\n?\[\[REMEMBER:[^\]]+\]\]/, '').trim();
  return { clean, category: match[1].trim(), content: match[2].trim() };
}

function shouldSaveMemory(text: string): boolean {
  const triggers = [
    'pb', 'personal best', 'competition', 'tournament', 'video idea',
    'sponsorship', 'subscriber', 'student', 'lesson', 'upload',
    'training', 'solve time', 'algorithm', 'oll', 'pll', 'zbll',
  ];
  return triggers.some((t) => text.toLowerCase().includes(t));
}

const GREETINGS = [
  "Hey Caiden, what's up?",
  "How's it going, Caiden?",
  "Good to see you, Caiden.",
  "Hey Caiden! How's your day going?",
  "What's up, Caiden?",
  "How's practice going, Caiden?",
  "Hey Caiden, how are you doing?",
  "Ready to crush it today, Caiden?",
  "What's good, Caiden?",
  "How you doing, Caiden?",
];

const NUM_BARS = 28;

export default function Chat({ onBack, memories }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load persisted history on first render
    if (typeof window === 'undefined') return [];
    return loadHistory().map(({ role, content }) => ({ role, content }));
  });
  const [input, setInput] = useState('');
  const [greetingIndex] = useState(() => Math.floor(Math.random() * GREETINGS.length));
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(NUM_BARS).fill(0));
  const [chips, setChips] = useState<ActionChip[]>([]);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [executing, setExecuting] = useState(false);
  const [calendarContext, setCalendarContext] = useState<string>('');
  const [emailContext, setEmailContext] = useState<string>('');
  const [youtubeContext, setYoutubeContext] = useState<string>('');
  const calendarEventsRef = useRef<Array<{ id?: string; summary?: string; start?: { dateTime?: string; date?: string } }>>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Save history whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveHistory(messages);
    }
  }, [messages]);

  // Register push subscription on mount
  useEffect(() => {
    const subscribeToPush = async () => {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const reg = await navigator.serviceWorker.ready;
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) return;

        const existing = await reg.pushManager.getSubscription();
        const sub = existing || await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        });

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub),
        });
      } catch {
        // Push not supported or blocked — skip silently
      }
    };
    subscribeToPush();
  }, []);

  // Morning briefing — trigger once per day when opening chat in the morning (6–11 AM)
  useEffect(() => {
    const checkMorningBriefing = async () => {
      if (typeof window === 'undefined') return;

      const hour = new Date().getHours();
      if (hour < 6 || hour >= 11) return; // only 6–11 AM

      const today = new Date().toDateString();
      const lastBriefing = localStorage.getItem('faith_last_briefing');
      if (lastBriefing === today) return; // already shown today

      localStorage.setItem('faith_last_briefing', today);

      // Only auto-brief if starting a fresh session (< 3 messages loaded)
      if (messages.length > 2) return;

      try {
        const tasks = getTodaysTasks();
        const goals = getGoals();
        const res = await fetch('/api/briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tasks: tasks.map((t) => `- [${t.completed ? 'x' : ' '}] ${t.title}`).join('\n'),
            goals: goals.filter((g) => !g.completed).map((g) => `- ${g.title}`).join('\n'),
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.briefing) {
          setMessages((prev) => [...prev, { role: 'assistant', content: stripMarkdown(data.briefing) }]);
        }
      } catch {
        // Briefing failed — skip silently
      }
    };
    checkMorningBriefing();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch upcoming calendar events for context
  useEffect(() => {
    const fetchCal = async () => {
      try {
        const now = new Date().toISOString();
        const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const res = await fetch(`/api/google/calendar?timeMin=${encodeURIComponent(now)}&timeMax=${encodeURIComponent(weekEnd)}`);
        if (!res.ok) return;
        const data = await res.json();
        const events: Array<{ id?: string; summary?: string; start?: { dateTime?: string; date?: string } }> = data.events || [];
        calendarEventsRef.current = events;
        if (events.length === 0) {
          setCalendarContext('No upcoming events this week');
        } else {
          const lines = events.map((e) => {
            const dt = e.start?.dateTime || e.start?.date || '';
            const d = dt ? new Date(dt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
            return `- ${e.summary || 'Untitled'}${d ? ` (${d})` : ''}`;
          });
          setCalendarContext(lines.join('\n'));
        }
      } catch {
        // Calendar not connected — skip silently
      }
    };
    fetchCal();
  }, []);

  // Fetch recent unread emails for context (include message IDs so Faith can reply)
  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const res = await fetch('/api/google/gmail?maxResults=10&q=is:unread');
        if (!res.ok) return;
        const data = await res.json();
        const emails: Array<{ id: string; subject: string; from: string; date: string; snippet: string }> = data.emails || [];
        if (emails.length === 0) {
          setEmailContext('No unread emails');
        } else {
          const lines = emails.map((e, i) => {
            const fromName = e.from.replace(/<[^>]+>/, '').trim();
            return `${i + 1}. [msg_id:${e.id}] From: ${fromName} | Subject: ${e.subject} | ${e.snippet.slice(0, 100)}`;
          });
          setEmailContext(lines.join('\n'));
        }
      } catch {
        // Gmail not connected — skip silently
      }
    };
    fetchEmails();
  }, []);

  // Fetch YouTube channel stats for context
  useEffect(() => {
    const fetchYoutube = async () => {
      try {
        const res = await fetch('/api/google/youtube');
        if (!res.ok) return;
        const data = await res.json();
        if (!data.channel?.name) return;

        const ch = data.channel;
        const subCount = parseInt(ch.subscribers || '0').toLocaleString();
        const viewCount = parseInt(ch.totalViews || '0').toLocaleString();
        let context = `Channel: ${ch.name} | ${subCount} subscribers | ${viewCount} total views | ${ch.videoCount} videos`;

        if (data.recentVideos?.length > 0) {
          const vidLines = data.recentVideos.map((v: { title: string; views: string; likes: string; comments: string }) =>
            `- "${v.title}" — ${parseInt(v.views || '0').toLocaleString()} views, ${parseInt(v.likes || '0').toLocaleString()} likes`
          );
          context += `\nRecent videos:\n${vidLines.join('\n')}`;
        }

        setYoutubeContext(context);
      } catch {
        // YouTube not connected — skip silently
      }
    };
    fetchYoutube();
  }, []);

  // Resize textarea whenever input changes (handles voice-set text too)
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    });
  }, [input]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      audioContextRef.current?.close();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const stopAudio = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    audioContextRef.current?.close().catch(() => {});
    streamRef.current?.getTracks().forEach(t => t.stop());
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
      analyser.fftSize = 128;
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
      // fallback: animate randomly
      const animate = () => {
        setAudioLevels(Array(NUM_BARS).fill(0).map(() => Math.random() * 0.6 + 0.1));
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      const userMessage: Message = { role: 'user', content: content.trim() };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput('');
      if (inputRef.current) inputRef.current.style.height = '28px';
      setIsStreaming(true);
      setChips([]);

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      try {
        const memoryContext = getMemoriesAsContext();
        const onboardingData =
          typeof window !== 'undefined'
            ? {
                wakeTime: localStorage.getItem('faith_wake_time') || undefined,
                cubingGoal: localStorage.getItem('faith_cubing_goal') || undefined,
                uploadDays: localStorage.getItem('faith_upload_days') || undefined,
              }
            : undefined;

        // Build live context: tasks, goals, and calendar
        const tasks = getTodaysTasks();
        const goals = getGoals();
        const currentContext = {
          tasks: tasks.length > 0
            ? tasks.map((t) => `- [${t.completed ? 'x' : ' '}] ${t.title}${t.isRoutine ? ' (routine)' : ''}`).join('\n')
            : 'No tasks today',
          goals: goals.length > 0
            ? goals.map((g) => `- [${g.completed ? 'achieved' : 'active'}] ${g.title}`).join('\n')
            : 'No goals set',
          calendar: calendarContext || undefined,
          email: emailContext || undefined,
          contacts: getContactsAsContext() || undefined,
          youtube: youtubeContext || undefined,
          recentHistory: messages.length > 4 ? getHistoryForContext() : undefined,
        };

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: newMessages, memoryContext, onboardingData, currentContext }),
        });

        if (!res.ok || !res.body) throw new Error('Failed to connect to Faith');

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
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: fullText };
                    return updated;
                  });
                }
              } catch { /* skip */ }
            }
          }
        }

        // Parse and handle [[REMEMBER:]] tag
        const memoryMatch = parseMemoryTag(fullText);
        if (memoryMatch) {
          addMemory(memoryMatch.category, memoryMatch.content);
          // Strip tag from displayed message
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: memoryMatch.clean };
            return updated;
          });
          fullText = memoryMatch.clean;
          setChips((prev) => [...prev, { type: 'memory', label: 'Saved to memory' }]);
        }

        // Parse all action tags and queue for confirmation
        const actions = parseAllActions(fullText);
        if (actions.length > 0) {
          const cleaned = cleanActionTags(fullText);
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: stripMarkdown(cleaned) };
            return updated;
          });
          fullText = cleaned;
          setPendingActions(actions);
        }

        setChips((prev) => [...prev, ...detectActions(fullText)]);

        if (shouldSaveMemory(fullText) && fullText.length > 50) {
          const lower = fullText.toLowerCase();
          const category =
            lower.includes('video') || lower.includes('youtube') ? 'YouTube & Content'
            : lower.includes('sponsor') || lower.includes('gan') ? 'Sponsorships'
            : lower.includes('student') || lower.includes('lesson') ? 'Coaching'
            : 'Cubing & Competition';
          addMemory(category, content.trim().slice(0, 120));
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Something went wrong';
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: `Something went wrong: ${errorMsg}. Try again?` };
          return updated;
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, isStreaming]
  );

  const executeActions = async () => {
    setExecuting(true);
    const errors: string[] = [];
    const chips: ActionChip[] = [];
    const createdDocs: Array<{ name: string; url: string }> = [];

    for (const action of pendingActions) {
      try {
        if (action.type === 'add_task') {
          addTask(action.raw.title, false);
        } else if (action.type === 'task_done') {
          const task = getTodaysTasks().find(
            (t) => t.title.toLowerCase() === action.raw.title.toLowerCase()
          );
          if (task && !task.completed) toggleTask(task.id);
        } else if (action.type === 'delete_task') {
          const task = getTodaysTasks().find(
            (t) => t.title.toLowerCase() === action.raw.title.toLowerCase()
          );
          if (task) deleteTask(task.id);
        } else if (action.type === 'add_goal') {
          addGoal(action.raw.title);
        } else if (action.type === 'goal_done') {
          const goal = getGoals().find(
            (g) => g.title.toLowerCase() === action.raw.title.toLowerCase()
          );
          if (goal && !goal.completed) toggleGoal(goal.id);
        } else if (action.type === 'delete_goal') {
          const goal = getGoals().find(
            (g) => g.title.toLowerCase() === action.raw.title.toLowerCase()
          );
          if (goal) deleteGoal(goal.id);
        } else if (action.type === 'cal_delete') {
          // Find event by title (case-insensitive, partial match)
          const titleLower = action.raw.title.toLowerCase();
          const match = calendarEventsRef.current.find((e) =>
            (e.summary || '').toLowerCase().includes(titleLower) ||
            titleLower.includes((e.summary || '').toLowerCase())
          );
          if (!match?.id) {
            errors.push(`${action.raw.title}: event not found — try refreshing the app`);
          } else {
            const res = await fetch(`/api/google/calendar?eventId=${encodeURIComponent(match.id)}`, {
              method: 'DELETE',
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              errors.push(`${action.raw.title}: ${data.error || res.statusText}`);
            } else {
              // Remove from local ref so stale lookups don't match it again
              calendarEventsRef.current = calendarEventsRef.current.filter((e) => e.id !== match.id);
              chips.push({ type: 'calendar', label: 'Removed from Calendar' });
            }
          }
        } else if (action.type === 'create_doc') {
          const res = await fetch('/api/google/drive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: action.raw.title, content: action.raw.content }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            errors.push(`${action.raw.title}: ${data.error || res.statusText}`);
          } else {
            const data = await res.json();
            createdDocs.push({ name: data.name, url: data.url });
            chips.push({ type: 'calendar', label: `Doc created: ${data.name}` });
          }
        } else if (action.type === 'gmail_reply') {
          const res = await fetch('/api/google/gmail', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageId: action.raw.messageId, body: action.raw.body }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            errors.push(`Reply failed: ${data.error || res.statusText}`);
          } else {
            chips.push({ type: 'task', label: 'Email reply sent' });
          }
        } else if (action.type === 'save_contact') {
          saveContact(action.raw.name, action.raw.phone);
          chips.push({ type: 'memory', label: `Contact saved: ${action.raw.name}` });
        } else if (action.type === 'sms_send') {
          // Resolve name to phone number if needed
          let to = action.raw.to;
          if (!to.match(/^\+?\d/)) {
            const contact = findContact(to);
            if (!contact) {
              errors.push(`${to}: no phone number saved — ask Faith to save it first`);
              continue;
            }
            to = contact.phone;
          }
          const res = await fetch('/api/sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, message: action.raw.message }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            errors.push(`Text to ${action.raw.to}: ${data.error || res.statusText}`);
          } else {
            chips.push({ type: 'task', label: `Text sent to ${action.raw.to}` });
          }
        } else if (action.type === 'gmail_send') {
          const res = await fetch('/api/google/gmail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: action.raw.to,
              subject: action.raw.subject,
              message: action.raw.body,
            }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            errors.push(`Email to ${action.raw.to}: ${data.error || res.statusText}`);
          } else {
            chips.push({ type: 'task', label: `Email sent to ${action.raw.to}` });
          }
        } else if (action.type === 'cal_add') {
          const { title, date, startTime, endTime, repeat } = action.raw;
          const start = new Date(`${date}T${startTime}`);
          const end = new Date(`${date}T${endTime}`);
          if (start <= new Date()) start.setDate(start.getDate() + 1);
          const adjustedEnd = new Date(start.getTime() + (end.getTime() - new Date(`${date}T${startTime}`).getTime()));
          const res = await fetch('/api/google/calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              summary: title,
              start: start.toISOString(),
              end: adjustedEnd.toISOString(),
              recurrence: buildRRule(repeat),
            }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            errors.push(`${title}: ${data.error || res.statusText}`);
          } else {
            chips.push({ type: 'calendar', label: 'Added to Calendar' });
          }
        }
      } catch {
        errors.push(`${action.label}: failed`);
      }
    }

    setExecuting(false);
    setPendingActions([]);

    const hasTasks = pendingActions.some((a) => a.type.includes('task'));
    const hasGoals = pendingActions.some((a) => a.type.includes('goal'));
    if (hasTasks) chips.push({ type: 'task', label: 'Tasks updated' });
    if (hasGoals) chips.push({ type: 'task', label: 'Goals updated' });
    if (chips.length > 0) setChips((prev) => [...prev, ...chips]);

    if (errors.length > 0) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `Ran into an issue with: ${errors.join(', ')}. Want to try again?`,
      }]);
    } else if (createdDocs.length > 0) {
      const docLinks = createdDocs.map((d) => `${d.name}: ${d.url}`).join('\n');
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `Done. Here ${createdDocs.length === 1 ? 'is your doc' : 'are your docs'}:\n${docLinks}`,
      }]);
    } else {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Done.' }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRec = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SpeechRec) { alert("Voice input isn't supported on this browser."); return; }

    const recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setInterimText('');
      startAudioVisualizer();
    };
    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
      stopAudio();
      recognitionRef.current = null;
    };
    recognition.onerror = () => {
      setIsListening(false);
      setInterimText('');
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
  }, [startAudioVisualizer, stopAudio, sendMessage]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimText('');
    stopAudio();
  }, [stopAudio]);

  return (
    <div className="full-screen flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center px-4 pt-safe pb-3 shrink-0">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/5 transition-smooth active:scale-95 mr-2"
          aria-label="Back"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9L11 14" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex-1 flex flex-col items-center">
          <span className="faith-wordmark text-lg text-white tracking-widest">Faith</span>
        </div>
        <div className="w-9" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scroll-momentum px-4 py-2 space-y-2">
        {messages.length === 0 && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-white/40 text-center text-xl font-light px-8">
              {GREETINGS[greetingIndex]}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-[#3b82f6] text-white rounded-[20px] rounded-br-[5px]'
                  : 'bg-[#1c1c1e] text-white/90 rounded-[20px] rounded-bl-[5px]'
              }`}
            >
              {msg.content ? (
                msg.role === 'assistant' ? stripMarkdown(msg.content) : msg.content
              ) : (
                <span className="inline-flex gap-1 py-0.5">
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
          </div>
        ))}

        {chips.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {chips.map((chip, i) => (
              <span key={i} className="px-3 py-1 bg-[#1c1c1e] border border-white/10 rounded-full text-white/50 text-xs font-medium">
                {chip.type === 'calendar' ? '🗓️' : chip.type === 'memory' ? '🧠' : '✅'} {chip.label}
              </span>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div
        className="shrink-0 px-3 py-2 bg-[#0a0a0a]"
        style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
      >
        {isListening ? (
          /* Recording UI */
          <div
            className="flex flex-col items-center gap-3 bg-[#1c1c1e] rounded-[26px] px-4 py-4"
            onClick={stopListening}
          >
            {/* Waveform */}
            <div className="flex items-center gap-[3px] h-10">
              {audioLevels.map((level, i) => (
                <div
                  key={i}
                  className="rounded-full bg-[#3b82f6] transition-all duration-75"
                  style={{
                    width: '3px',
                    height: `${Math.max(4, level * 36)}px`,
                    opacity: 0.5 + level * 0.5,
                  }}
                />
              ))}
            </div>
            <p className="text-white/25 text-xs">Tap to stop</p>
          </div>
        ) : (
          /* Normal input */
          <div className="flex items-end gap-2 bg-[#1c1c1e] rounded-[26px] px-3 py-2">
            <button
              onClick={startListening}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-smooth shrink-0 active:scale-95 hover:bg-white/10"
              aria-label="Start voice input"
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
              onChange={(e) => {
                setInput(e.target.value);
                const el = e.target;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 200) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder="Message"
              rows={1}
              className="flex-1 bg-transparent text-white text-sm placeholder-white/25 resize-none focus:outline-none py-1.5"
              style={{ minHeight: '28px', maxHeight: '200px', overflowY: 'auto' }}
            />

            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isStreaming}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[#3b82f6] hover:bg-blue-400 disabled:opacity-0 transition-all shrink-0 active:scale-95"
              aria-label="Send"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 11V3M7 3L3.5 6.5M7 3L10.5 6.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Unified action confirmation modal */}
      {pendingActions.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/60">
          <div className="w-full max-w-sm bg-[#1c1c1e] border border-white/10 rounded-3xl p-5 space-y-4">
            <div className="space-y-1">
              <p className="text-white font-medium text-sm">Make these changes?</p>
              <p className="text-white/40 text-xs">Faith is ready to do the following</p>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingActions.map((action, i) => {
                const color =
                  action.type.includes('task') ? '#34d399'
                  : action.type.includes('goal') ? '#fbbf24'
                  : action.type === 'cal_delete' ? '#f87171'
                  : action.type === 'gmail_send' || action.type === 'gmail_reply' ? '#60a5fa'
                  : action.type === 'sms_send' ? '#34d399'
                  : action.type === 'save_contact' ? '#a78bfa'
                  : action.type === 'create_doc' ? '#c084fc'
                  : '#a78bfa';
                const verb =
                  action.type === 'add_task' ? 'Add task'
                  : action.type === 'task_done' ? 'Complete task'
                  : action.type === 'delete_task' ? 'Delete task'
                  : action.type === 'add_goal' ? 'Add goal'
                  : action.type === 'goal_done' ? 'Mark achieved'
                  : action.type === 'delete_goal' ? 'Delete goal'
                  : action.type === 'cal_delete' ? 'Remove from Calendar'
                  : action.type === 'gmail_send' ? 'Send email'
                  : action.type === 'gmail_reply' ? 'Reply to email'
                  : action.type === 'sms_send' ? 'Send text message'
                  : action.type === 'save_contact' ? 'Save contact'
                  : action.type === 'create_doc' ? 'Create Google Doc'
                  : 'Add to Calendar';
                return (
                  <div key={i} className="bg-[#111] rounded-2xl px-4 py-3 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <p className="text-white/50 text-xs">{verb}</p>
                    </div>
                    <p className="text-white text-sm font-medium pl-3.5">{action.label}</p>
                    {action.subtitle && (
                      <p className="text-white/40 text-xs pl-3.5">{action.subtitle}</p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={executeActions}
                disabled={executing}
                className="flex-1 py-2.5 bg-[#3b82f6] hover:bg-blue-400 disabled:opacity-50 text-white rounded-2xl text-sm font-medium transition-smooth active:scale-95"
              >
                {executing ? 'Doing it...' : 'Yes, do it'}
              </button>
              <button
                onClick={() => setPendingActions([])}
                className="px-4 py-2.5 text-white/40 hover:text-white/60 rounded-2xl text-sm transition-smooth"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
