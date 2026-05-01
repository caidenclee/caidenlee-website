export async function requestPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
}

export function scheduleNotification(
  title: string,
  body: string,
  delayMs: number
): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  setTimeout(() => {
    try {
      new Notification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
      });
    } catch (err) {
      console.warn('Notification failed:', err);
    }
  }, delayMs);
}

export interface CalendarEvent {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

export function checkUpcomingReminders(events: CalendarEvent[]): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const now = Date.now();
  const reminderWindowMs = 30 * 60 * 1000; // 30 minutes

  for (const event of events) {
    if (!event.summary) continue;
    const startStr = event.start?.dateTime || event.start?.date;
    if (!startStr) continue;

    const startTime = new Date(startStr).getTime();
    const timeUntil = startTime - now;

    // Notify if event is 25–35 minutes away
    if (timeUntil > 25 * 60 * 1000 && timeUntil < 35 * 60 * 1000) {
      scheduleNotification(
        `Upcoming: ${event.summary}`,
        `Starting in about 30 minutes`,
        timeUntil - reminderWindowMs
      );
    }

    // Notify if event is 5–10 minutes away
    if (timeUntil > 4 * 60 * 1000 && timeUntil < 10 * 60 * 1000) {
      scheduleNotification(
        `Starting soon: ${event.summary}`,
        `This starts in about 5 minutes!`,
        Math.max(0, timeUntil - 5 * 60 * 1000)
      );
    }
  }
}
