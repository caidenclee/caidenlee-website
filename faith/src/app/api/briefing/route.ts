import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import webpush from 'web-push';
import { readFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

const SUBSCRIPTION_FILE = path.join(process.cwd(), '.push-subscription.json');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getCalendarContext(request: NextRequest): Promise<string> {
  try {
    const token = request.cookies.get('google_token')?.value;
    const refreshToken = request.cookies.get('google_refresh_token')?.value;
    if (!token) return '';

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`
    );
    oauth2Client.setCredentials({ access_token: token, refresh_token: refreshToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: weekEnd.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 10,
    });

    const events = res.data.items || [];
    if (events.length === 0) return 'No upcoming events today.';
    return events.map((e) => {
      const dt = e.start?.dateTime || e.start?.date || '';
      const d = dt ? new Date(dt).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : '';
      return `- ${e.summary}${d ? ` at ${d}` : ''}`;
    }).join('\n');
  } catch {
    return '';
  }
}

async function getEmailContext(request: NextRequest): Promise<string> {
  try {
    const token = request.cookies.get('google_token')?.value;
    const refreshToken = request.cookies.get('google_refresh_token')?.value;
    if (!token) return '';

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`
    );
    oauth2Client.setCredentials({ access_token: token, refresh_token: refreshToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const listRes = await gmail.users.messages.list({ userId: 'me', maxResults: 5, q: 'is:unread' });
    const ids = listRes.data.messages || [];
    if (ids.length === 0) return 'No unread emails.';

    const emails = await Promise.all(ids.map(async (msg) => {
      const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id!, format: 'metadata', metadataHeaders: ['Subject', 'From'] });
      const headers = detail.data.payload?.headers || [];
      const get = (n: string) => headers.find((h) => h.name?.toLowerCase() === n.toLowerCase())?.value || '';
      return `- From ${get('From').replace(/<[^>]+>/, '').trim()}: ${get('Subject') || '(no subject)'}`;
    }));

    return emails.join('\n');
  } catch {
    return '';
  }
}

// POST — generate briefing text
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { tasks, goals, sendPush } = body;

    const calendarContext = await getCalendarContext(request);
    const emailContext = await getEmailContext(request);

    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });

    const prompt = `You are Faith, Caiden's personal assistant. Generate a concise morning briefing for Caiden. Keep it under 120 words. Be warm and direct — no markdown, no bullet symbols, no bold. Just conversational sentences. Mention what's on his calendar today, flag important emails if any, and give him one motivating sentence to start the day.

Today is ${today}.
${calendarContext ? `\nCalendar:\n${calendarContext}` : ''}
${emailContext ? `\nUnread emails:\n${emailContext}` : ''}
${tasks ? `\nToday's tasks:\n${tasks}` : ''}
${goals ? `\nActive goals:\n${goals}` : ''}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const briefingText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Optionally send push notification
    if (sendPush) {
      try {
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        const privateKey = process.env.VAPID_PRIVATE_KEY;
        const email = process.env.VAPID_EMAIL || 'mailto:faith@app.local';
        if (publicKey && privateKey) {
          webpush.setVapidDetails(email, publicKey, privateKey);
          const raw = await readFile(SUBSCRIPTION_FILE, 'utf-8').catch(() => null);
          if (raw) {
            const subscription = JSON.parse(raw);
            await webpush.sendNotification(
              subscription,
              JSON.stringify({ title: 'Good morning from Faith', body: briefingText.slice(0, 120), url: '/' })
            );
          }
        }
      } catch {
        // Push failed — still return briefing text
      }
    }

    return NextResponse.json({ briefing: briefingText });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Briefing error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
