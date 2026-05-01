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

// GET — channel stats + recent video performance
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthClient(request);
    const youtube = google.youtube({ version: 'v3', auth });

    // Channel overview
    const channelRes = await youtube.channels.list({
      part: ['statistics', 'snippet'],
      mine: true,
    });
    const channel = channelRes.data.items?.[0];

    // Recent videos
    const searchRes = await youtube.search.list({
      part: ['snippet'],
      forMine: true,
      type: ['video'],
      order: 'date',
      maxResults: 5,
    });

    const videoIds = (searchRes.data.items || [])
      .map((v) => v.id?.videoId)
      .filter((id): id is string => Boolean(id));

    let recentVideos: Array<{
      title: string;
      views: string;
      likes: string;
      comments: string;
      publishedAt: string;
    }> = [];

    if (videoIds.length > 0) {
      const statsRes = await youtube.videos.list({
        part: ['statistics', 'snippet'],
        id: videoIds,
      });
      recentVideos = (statsRes.data.items || []).map((v) => ({
        title: v.snippet?.title || 'Untitled',
        views: v.statistics?.viewCount || '0',
        likes: v.statistics?.likeCount || '0',
        comments: v.statistics?.commentCount || '0',
        publishedAt: v.snippet?.publishedAt || '',
      }));
    }

    return NextResponse.json({
      channel: {
        name: channel?.snippet?.title,
        subscribers: channel?.statistics?.subscriberCount,
        totalViews: channel?.statistics?.viewCount,
        videoCount: channel?.statistics?.videoCount,
      },
      recentVideos,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'YouTube error';
    const status = msg === 'Not authenticated' ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
