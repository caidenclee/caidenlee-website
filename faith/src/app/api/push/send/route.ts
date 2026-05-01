import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { readFile } from 'fs/promises';
import path from 'path';

const SUBSCRIPTION_FILE = path.join(process.cwd(), '.push-subscription.json');

export async function POST(request: NextRequest) {
  try {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const email = process.env.VAPID_EMAIL || 'mailto:faith@app.local';

    if (!publicKey || !privateKey) {
      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 503 });
    }

    webpush.setVapidDetails(email, publicKey, privateKey);

    const { title, body, url } = await request.json();

    const raw = await readFile(SUBSCRIPTION_FILE, 'utf-8').catch(() => null);
    if (!raw) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    const subscription = JSON.parse(raw);
    const payload = JSON.stringify({ title, body, url: url || '/' });

    await webpush.sendNotification(subscription, payload);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Push error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
