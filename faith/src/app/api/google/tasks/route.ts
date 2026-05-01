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

// GET — list tasks
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthClient(request);
    const tasksApi = google.tasks({ version: 'v1', auth });

    // Get the first task list
    const listsResponse = await tasksApi.tasklists.list({ maxResults: 1 });
    const taskListId = listsResponse.data.items?.[0]?.id;

    if (!taskListId) {
      return NextResponse.json({ tasks: [] });
    }

    const response = await tasksApi.tasks.list({
      tasklist: taskListId,
      showCompleted: true,
      showHidden: false,
      maxResults: 100,
    });

    return NextResponse.json({ tasks: response.data.items || [] });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Tasks error';
    const status = errorMsg === 'Not authenticated' ? 401 : 500;
    return NextResponse.json({ error: errorMsg }, { status });
  }
}

// POST — create task
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthClient(request);
    const tasksApi = google.tasks({ version: 'v1', auth });

    const body = await request.json();
    const { title, notes, due } = body;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    // Get or create task list
    const listsResponse = await tasksApi.tasklists.list({ maxResults: 1 });
    let taskListId = listsResponse.data.items?.[0]?.id;

    if (!taskListId) {
      const newList = await tasksApi.tasklists.insert({
        requestBody: { title: 'Faith Tasks' },
      });
      taskListId = newList.data.id!;
    }

    const response = await tasksApi.tasks.insert({
      tasklist: taskListId,
      requestBody: {
        title,
        notes,
        due: due ? new Date(due).toISOString() : undefined,
      },
    });

    return NextResponse.json({ task: response.data });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Create task error';
    const status = errorMsg === 'Not authenticated' ? 401 : 500;
    return NextResponse.json({ error: errorMsg }, { status });
  }
}

// DELETE — delete task
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthClient(request);
    const tasksApi = google.tasks({ version: 'v1', auth });

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    // Get first task list
    const listsResponse = await tasksApi.tasklists.list({ maxResults: 1 });
    const taskListId = listsResponse.data.items?.[0]?.id;

    if (!taskListId) {
      return NextResponse.json({ error: 'No task list found' }, { status: 404 });
    }

    await tasksApi.tasks.delete({
      tasklist: taskListId,
      task: taskId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Delete task error';
    const status = errorMsg === 'Not authenticated' ? 401 : 500;
    return NextResponse.json({ error: errorMsg }, { status });
  }
}
