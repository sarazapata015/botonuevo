import { NextRequest, NextResponse } from 'next/server';

const Pusher = require('pusher');

const pusher = new Pusher({
  appId: '2079081',
  key: '9d107dfd6c6872f19922',
  secret: '51d04d7d9adec62c4639',
  cluster: 'mt1',
  useTLS: true
});

export async function POST(request: NextRequest) {
  if (request.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { action } = await request.json();

  try {
    if (action === 'start') {
      console.log('[v0] Triggerando alarma de inicio');
      await pusher.trigger('alarm-channel', 'alarm-start', { timestamp: Date.now() });
    } else if (action === 'stop') {
      console.log('[v0] Triggerando parada de alarma');
      await pusher.trigger('alarm-channel', 'alarm-stop', { timestamp: Date.now() });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Error al triggear evento:', error);
    return NextResponse.json({ error: 'Failed to trigger event' }, { status: 500 });
  }
}
