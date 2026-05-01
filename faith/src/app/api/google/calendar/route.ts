import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

async function getAuthClient(request: NextRequest) {
  const token = request.cookies.get('google_token')?.value;
  const refreshToken = request.cookies.get('google_refresh_token')?.value;

  if (!token) {
    throw new Error('Not authenticated');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`
  );

  oauth2Client.setCredentials({
    access_token: token,
    refresh_token: refreshToken,
  });

  return oauth2Client;
}

// GET — list calendar events
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthClient(request);
    const calendar = google.calendar({ version: 'v3', auth });

    const { searchParams } = new URL(request.url);
    const timeMin = searchParams.get('timeMin') || new Date().toISOString();
    const timeMax =
      searchParams.get('timeMax') ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
    });

    return NextResponse.json({ events: response.data.items || [] });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Calendar error';
    const status = errorMsg === 'Not authenticated' ? 401 : 500;
    return NextResponse.json({ error: errorMsg }, { status });
  }
}

// POST — create event
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthClient(request);
    const calendar = google.calendar({ version: 'v3', auth });

    const body = await request.json();
    const { summary, start, end, description, recurrence } = body;

    if (!summary || !start || !end) {
      return NextResponse.json(
        { error: 'summary, start, and end are required' },
        { status: 400 }
      );
    }

    const requestBody: {
      summary: string;
      description?: string;
      start: { dateTime: string; timeZone: string };
      end: { dateTime: string; timeZone: string };
      recurrence?: string[];
    } = {
      summary,
      description,
      start: {
        dateTime: start,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: end,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    if (recurrence && recurrence.length > 0) {
      requestBody.recurrence = recurrence;
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody,
    });

    return NextResponse.json({ event: response.data });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Create event error';
    const status = errorMsg === 'Not authenticated' ? 401 : 500;
    return NextResponse.json({ error: errorMsg }, { status });
  }
}

// DELETE — delete event
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthClient(request);
    const calendar = google.calendar({ version: 'v3', auth });

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Delete event error';
    const status = errorMsg === 'Not authenticated' ? 401 : 500;
    return NextResponse.json({ error: errorMsg }, { status });
  }
}
