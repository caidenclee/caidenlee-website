import { NextRequest, NextResponse } from 'next/server';

// This endpoint lets Claude update Faith externally.
// Claude calls this URL with your secret API key to add tasks, goals, or notes.

function authorized(request: NextRequest): boolean {
  const key = request.headers.get('x-faith-key') || request.nextUrl.searchParams.get('key');
  return key === process.env.FAITH_API_KEY;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, payload } = body;

    // Return instructions for what Claude should tell the user to do,
    // since Faith's data lives in the browser (localStorage).
    // The actual update happens via a special URL the user opens.

    const validActions = ['add_task', 'add_goal', 'add_note', 'ping'];

    if (!validActions.includes(action)) {
      return NextResponse.json({ error: `Unknown action: ${action}. Valid: ${validActions.join(', ')}` }, { status: 400 });
    }

    if (action === 'ping') {
      return NextResponse.json({ ok: true, message: 'Faith API is live.' });
    }

    // Build a deep-link URL that Faith's app will intercept and execute
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-faith-app.vercel.app';
    const encoded = encodeURIComponent(JSON.stringify({ action, payload }));
    const deepLink = `${appUrl}/?faith_action=${encoded}`;

    return NextResponse.json({
      ok: true,
      action,
      payload,
      message: `Tell Caiden to tap this link to apply the update in Faith: ${deepLink}`,
      link: deepLink,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    message: 'Faith API is live.',
    actions: {
      add_task: { description: 'Add a task to Faith', payload: { title: 'string' } },
      add_goal: { description: 'Add a long-term goal to Faith', payload: { title: 'string' } },
      add_note: { description: 'Add a note/reminder', payload: { title: 'string', content: 'string' } },
      ping: { description: 'Check if the API is live', payload: {} },
    },
  });
}
