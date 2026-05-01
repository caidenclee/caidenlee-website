'use client';

import { useState, useEffect } from 'react';

interface CalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

interface CalendarViewProps {
  onBack: () => void;
  onOpenChat: () => void;
}

function formatTime(dateTimeStr?: string, dateStr?: string): string {
  const str = dateTimeStr || dateStr;
  if (!str) return '';
  const date = new Date(str);
  if (dateTimeStr) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return 'All day';
}

function formatDate(dateTimeStr?: string, dateStr?: string): string {
  const str = dateTimeStr || dateStr;
  if (!str) return '';
  const date = new Date(str);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function isToday(dateTimeStr?: string, dateStr?: string): boolean {
  const str = dateTimeStr || dateStr;
  if (!str) return false;
  const date = new Date(str);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function groupEvents(events: CalendarEvent[]) {
  const today: CalendarEvent[] = [];
  const week: CalendarEvent[] = [];
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  for (const event of events) {
    const str = event.start?.dateTime || event.start?.date;
    if (!str) continue;
    const date = new Date(str);
    if (date <= endOfToday && date >= now) {
      today.push(event);
    } else if (date > endOfToday) {
      week.push(event);
    }
  }

  return { today, week };
}

interface AddEventForm {
  title: string;
  date: string;
  time: string;
  endTime: string;
  description: string;
}

export default function CalendarView({ onBack, onOpenChat }: CalendarViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<AddEventForm>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    endTime: '10:00',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    fetchEvents();
    // Check for ?google=connected
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('google') === 'connected') {
        window.history.replaceState({}, '', '/');
      }
    }
  }, []);

  async function fetchEvents() {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch(
        `/api/google/calendar?timeMin=${encodeURIComponent(now)}&timeMax=${encodeURIComponent(weekEnd)}`
      );
      if (res.status === 401) {
        setIsConnected(false);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Failed to load events');
      const data = await res.json();
      setEvents(data.events || []);
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddEvent() {
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      const start = new Date(`${form.date}T${form.time}`).toISOString();
      const end = new Date(`${form.date}T${form.endTime}`).toISOString();
      const res = await fetch('/api/google/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: form.title,
          start,
          end,
          description: form.description,
        }),
      });
      if (!res.ok) throw new Error('Failed to create event');
      setShowAddForm(false);
      setForm({
        title: '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        endTime: '10:00',
        description: '',
      });
      fetchEvents();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating event');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm('Delete this event?')) return;
    try {
      await fetch(`/api/google/calendar?eventId=${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
      });
      fetchEvents();
    } catch {
      // ignore
    }
  }

  const { today: todayEvents, week: weekEvents } = groupEvents(events);

  const handleSetupItems = async (items: string[]) => {
    const errors: string[] = [];
    for (const item of items) {
      const parts = item.split('|').map((s) => s.trim());
      const title = parts[0] || item;
      const timeStr = parts[2] || '09:00 AM';
      const timeParts = timeStr.match(/(\d+):?(\d*)\s*(AM|PM)?/i);
      let hour = timeParts ? parseInt(timeParts[1]) : 9;
      const minute = timeParts && timeParts[2] ? parseInt(timeParts[2]) : 0;
      const ampm = timeParts?.[3]?.toUpperCase();
      if (ampm === 'PM' && hour < 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;

      // If the time has already passed today, schedule for tomorrow
      const start = new Date();
      start.setHours(hour, minute, 0, 0);
      if (start <= new Date()) {
        start.setDate(start.getDate() + 1);
      }
      const end = new Date(start.getTime() + 60 * 60 * 1000);

      try {
        const res = await fetch('/api/google/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ summary: title, start: start.toISOString(), end: end.toISOString() }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          errors.push(`${title}: ${data.error || res.statusText}`);
        }
      } catch (e) {
        errors.push(`${title}: network error`);
      }
    }
    if (errors.length > 0) {
      alert(`Some events couldn't be added:\n${errors.join('\n')}`);
    }
    setSetupDone(true);
    // Give Google's API a moment to index the new events before fetching
    setTimeout(() => fetchEvents(), 1500);
  };

  const isEmpty = !loading && isConnected && events.length === 0 && !setupDone;

  if (isEmpty) {
    return (
      <div className="full-screen flex flex-col">
        <div className="flex items-center justify-between px-4 pt-safe pb-3 border-b border-white/5 shrink-0">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-smooth active:scale-95">
            <span className="text-white/60 text-xl">←</span>
          </button>
          <h2 className="text-white font-medium tracking-wide">Calendar</h2>
          <div className="w-10" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5">
          <div className="w-14 h-14 rounded-full bg-violet-400/10 flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <rect x="3" y="5" width="20" height="18" rx="3" stroke="rgba(167,139,250,0.7)" strokeWidth="1.6"/>
              <path d="M3 11h20" stroke="rgba(167,139,250,0.7)" strokeWidth="1.6"/>
              <path d="M9 3v4M17 3v4" stroke="rgba(167,139,250,0.7)" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="space-y-2">
            <p className="text-white font-medium">Your calendar is empty</p>
            <p className="text-white/40 text-sm leading-relaxed">
              Want Faith to help you fill it in? She'll ask a few questions about your schedule and add events for you.
            </p>
          </div>
          <button
            onClick={onOpenChat}
            className="px-6 py-3 rounded-2xl text-sm font-medium transition-smooth active:scale-95"
            style={{ backgroundColor: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}
          >
            Talk to Faith
          </button>
          <button
            onClick={() => setSetupDone(true)}
            className="text-white/25 text-xs"
          >
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
        <h2 className="text-white font-medium tracking-wide">Calendar</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-400 transition-smooth active:scale-95"
          aria-label="Add event"
        >
          <span className="text-white text-xl font-light">+</span>
        </button>
      </div>

      {/* Today's date */}
      <div className="px-6 pt-5 pb-3 shrink-0">
        <p className="text-white/40 text-xs tracking-widest uppercase">Today</p>
        <p className="text-white text-xl font-light mt-0.5">{todayFormatted}</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scroll-momentum px-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : !isConnected ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-4">
            <p className="text-4xl">🗓️</p>
            <p className="text-white font-medium">Connect Google Calendar</p>
            <p className="text-white/40 text-sm leading-relaxed">
              Link your calendar so I can see your schedule and add events for you.
            </p>
            <a
              href="/api/google/auth"
              className="mt-2 px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-2xl font-medium transition-smooth active:scale-95 text-sm"
            >
              Connect Calendar
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Today's events */}
            <div>
              <p className="text-white/40 text-xs tracking-widest uppercase mb-3 px-1">
                Today's Events
              </p>
              {todayEvents.length === 0 ? (
                <div className="bg-[#111] border border-white/5 rounded-2xl px-4 py-5 text-center">
                  <p className="text-white/30 text-sm">No events today — you're free! 🎉</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {todayEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onDelete={() => event.id && handleDeleteEvent(event.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* This week */}
            {weekEvents.length > 0 && (
              <div>
                <p className="text-white/40 text-xs tracking-widest uppercase mb-3 px-1">
                  This Week
                </p>
                <div className="space-y-2">
                  {weekEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onDelete={() => event.id && handleDeleteEvent(event.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {events.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <p className="text-3xl">🎉</p>
                <p className="text-white/30 text-sm">Nothing scheduled this week — enjoy the freedom!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add more footer — only show when connected */}
      {isConnected && !loading && (
        <div className="shrink-0 px-4 py-3 border-t border-white/5">
          <button
            onClick={onOpenChat}
            className="w-full py-2.5 rounded-2xl text-sm font-medium text-violet-400/70 hover:text-violet-400 bg-violet-400/5 hover:bg-violet-400/10 transition-smooth active:scale-95"
          >
            + Ask Faith to add more
          </button>
        </div>
      )}

      {/* Add Event Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end">
          <div className="w-full bg-[#111] rounded-t-3xl px-5 pt-6 pb-safe space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium">New Event</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/70"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              placeholder="Event title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25"
              autoFocus
            />

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-white/40 text-xs mb-1 block">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-white/40 text-xs mb-1 block">Start</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-white/40 text-xs mb-1 block">End</label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                />
              </div>
            </div>

            <input
              type="text"
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25"
            />

            <button
              onClick={handleAddEvent}
              disabled={!form.title.trim() || submitting}
              className="w-full py-3 bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white rounded-2xl font-medium transition-smooth active:scale-95"
            >
              {submitting ? 'Adding...' : 'Add Event'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({
  event,
  onDelete,
}: {
  event: CalendarEvent;
  onDelete: () => void;
}) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      className="bg-[#111] border border-white/5 rounded-2xl px-4 py-4 flex items-start justify-between gap-3 active:border-white/10 transition-smooth"
      onClick={() => setShowDelete(!showDelete)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{event.summary || 'Untitled'}</p>
        <p className="text-blue-400 text-xs mt-0.5">
          {formatTime(event.start?.dateTime, event.start?.date)}
          {event.end?.dateTime || event.end?.date
            ? ` – ${formatTime(event.end?.dateTime, event.end?.date)}`
            : ''}
        </p>
        {!isToday(event.start?.dateTime, event.start?.date) && (
          <p className="text-white/30 text-xs mt-0.5">
            {formatDate(event.start?.dateTime, event.start?.date)}
          </p>
        )}
        {event.description && (
          <p className="text-white/30 text-xs mt-1 truncate">{event.description}</p>
        )}
      </div>
      {showDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="shrink-0 w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-300 text-sm"
          aria-label="Delete event"
        >
          🗑️
        </button>
      )}
    </div>
  );
}

