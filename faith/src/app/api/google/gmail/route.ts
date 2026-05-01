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

function decodeBase64(data: string): string {
  try {
    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

function getEmailBody(payload: {
  mimeType?: string;
  body?: { data?: string };
  parts?: Array<{ mimeType?: string; body?: { data?: string }; parts?: unknown[] }>;
}): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64(payload.body.data).slice(0, 500);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64(part.body.data).slice(0, 500);
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        const raw = decodeBase64(part.body.data);
        // Strip HTML tags for a plain-text snippet
        return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
      }
    }
  }
  return '';
}

// GET — list recent unread emails (last 10)
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthClient(request);
    const gmail = google.gmail({ version: 'v1', auth });

    const { searchParams } = new URL(request.url);
    const maxResults = parseInt(searchParams.get('maxResults') || '10', 10);
    const query = searchParams.get('q') || 'is:unread';

    const listRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: query,
    });

    const messageIds = listRes.data.messages || [];
    if (messageIds.length === 0) {
      return NextResponse.json({ emails: [] });
    }

    const emails = await Promise.all(
      messageIds.map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'full',
        });
        const headers = detail.data.payload?.headers || [];
        const get = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
        return {
          id: detail.data.id,
          threadId: detail.data.threadId,
          subject: get('Subject') || '(no subject)',
          from: get('From'),
          date: get('Date'),
          snippet: detail.data.snippet || '',
          body: getEmailBody(detail.data.payload as Parameters<typeof getEmailBody>[0]),
          isUnread: (detail.data.labelIds || []).includes('UNREAD'),
        };
      })
    );

    return NextResponse.json({ emails });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Gmail error';
    const status = errorMsg === 'Not authenticated' ? 401 : 500;
    return NextResponse.json({ error: errorMsg }, { status });
  }
}

// POST — send an email
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthClient(request);
    const gmail = google.gmail({ version: 'v1', auth });

    const body = await request.json();
    const { to, subject, message } = body;

    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: 'to, subject, and message are required' },
        { status: 400 }
      );
    }

    // Get sender's email address
    const profileRes = await gmail.users.getProfile({ userId: 'me' });
    const from = profileRes.data.emailAddress || 'me';

    const rawEmail = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      message,
    ].join('\r\n');

    const encoded = Buffer.from(rawEmail)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const sendRes = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encoded },
    });

    return NextResponse.json({ success: true, id: sendRes.data.id });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Send email error';
    const status = errorMsg === 'Not authenticated' ? 401 : 500;
    return NextResponse.json({ error: errorMsg }, { status });
  }
}

// PATCH — reply to an existing email thread
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthClient(request);
    const gmail = google.gmail({ version: 'v1', auth });

    const { messageId, body } = await request.json();
    if (!messageId || !body) {
      return NextResponse.json({ error: 'messageId and body are required' }, { status: 400 });
    }

    // Fetch original message headers to build proper reply
    const original = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'metadata',
      metadataHeaders: ['Subject', 'From', 'To', 'Message-Id', 'References'],
    });

    const headers = original.data.payload?.headers || [];
    const get = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    const profileRes = await gmail.users.getProfile({ userId: 'me' });
    const from = profileRes.data.emailAddress || 'me';

    const originalSubject = get('Subject');
    const subject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;
    const replyTo = get('From');
    const msgIdHeader = get('Message-Id');
    const existingRefs = get('References');
    const references = existingRefs ? `${existingRefs} ${msgIdHeader}` : msgIdHeader;

    const rawEmail = [
      `From: ${from}`,
      `To: ${replyTo}`,
      `Subject: ${subject}`,
      `In-Reply-To: ${msgIdHeader}`,
      `References: ${references}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      body,
    ].join('\r\n');

    const encoded = Buffer.from(rawEmail)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const sendRes = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encoded,
        threadId: original.data.threadId || undefined,
      },
    });

    return NextResponse.json({ success: true, id: sendRes.data.id });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Reply error';
    const status = errorMsg === 'Not authenticated' ? 401 : 500;
    return NextResponse.json({ error: errorMsg }, { status });
  }
}
