import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('google_token');
  const refreshToken = request.cookies.get('google_refresh_token');

  return NextResponse.json({
    connected: !!(token?.value || refreshToken?.value),
  });
}
