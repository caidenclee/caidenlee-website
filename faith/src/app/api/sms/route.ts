import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(request: NextRequest) {
  try {
    const { to, message } = await request.json();

    if (!to || !message) {
      return NextResponse.json({ error: 'to and message are required' }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !from) {
      return NextResponse.json(
        { error: 'Twilio not configured — add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to .env.local' },
        { status: 503 }
      );
    }

    const client = twilio(accountSid, authToken);
    const msg = await client.messages.create({ body: message, from, to });

    return NextResponse.json({ success: true, sid: msg.sid });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'SMS error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
