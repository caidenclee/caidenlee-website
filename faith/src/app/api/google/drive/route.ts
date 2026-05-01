import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

async function getAuthClient(request: NextRequest) {
  const token = request.cookies.get('google_token')?.value;
  const refreshToken = request.cookies.get('google_refresh_token')?.value;
  if (!token) throw new Error('Not authenticated');

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`
  );
  oauth2Client.setCredentials({ access_token: token, refresh_token: refreshToken });
  return oauth2Client;
}

// POST — create a Google Doc from title + plain-text content
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthClient(request);
    const drive = google.drive({ version: 'v3', auth });

    const { title, content } = await request.json();
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

    // Create a Google Doc (Drive converts text/plain → Google Docs format)
    const res = await drive.files.create({
      requestBody: {
        name: title,
        mimeType: 'application/vnd.google-apps.document',
      },
      media: {
        mimeType: 'text/plain',
        body: content || '',
      },
      fields: 'id,webViewLink,name',
    });

    return NextResponse.json({
      id: res.data.id,
      url: res.data.webViewLink,
      name: res.data.name,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Drive error';
    const status = msg === 'Not authenticated' ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// GET — list recent Google Docs created by Faith
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthClient(request);
    const drive = google.drive({ version: 'v3', auth });

    const res = await drive.files.list({
      pageSize: 15,
      fields: 'files(id,name,webViewLink,createdTime,modifiedTime)',
      orderBy: 'modifiedTime desc',
      q: "mimeType='application/vnd.google-apps.document' and trashed=false",
    });

    return NextResponse.json({ files: res.data.files || [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Drive error';
    const status = msg === 'Not authenticated' ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
