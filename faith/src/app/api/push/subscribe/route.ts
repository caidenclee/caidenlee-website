import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import path from 'path';

const SUBSCRIPTION_FILE = path.join(process.cwd(), '.push-subscription.json');

export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json();
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    // Store subscription to disk (single-user personal app)
    await writeFile(SUBSCRIPTION_FILE, JSON.stringify(subscription, null, 2), 'utf-8');

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Subscribe error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  try {
    const raw = await readFile(SUBSCRIPTION_FILE, 'utf-8');
    return NextResponse.json({ subscription: JSON.parse(raw) });
  } catch {
    return NextResponse.json({ subscription: null });
  }
}
