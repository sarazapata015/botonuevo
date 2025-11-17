import Pusher from "pusher";

const pusher = new Pusher({
  appId: "2079081",
  key: "9d107dfd6c6872f19922",
  secret: "51d04d7d9adec62c4639",
  cluster: "mt1",
  useTLS: true
});

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body;

  try {
    if (action === 'start') {
      console.log('[v0] Triggerando alarma de inicio');
      pusher.trigger('alarm-channel', 'alarm-start', { timestamp: Date.now() });
    } else if (action === 'stop') {
      console.log('[v0] Triggerando parada de alarma');
      pusher.trigger('alarm-channel', 'alarm-stop', { timestamp: Date.now() });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[v0] Error:', error);
    res.status(500).json({ error: 'Failed to trigger event' });
  }
}
