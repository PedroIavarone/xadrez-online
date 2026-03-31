import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusherServer';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const params = new URLSearchParams(body);

  const socketId   = params.get('socket_id')!;
  const channelName = params.get('channel_name')!;
  const userId     = params.get('user_id') || 'anon_' + Math.random().toString(36).slice(2);

  const authResponse = pusherServer.authorizeChannel(socketId, channelName, {
    user_id: userId,
    user_info: { name: userId },
  });

  return NextResponse.json(authResponse);
}
