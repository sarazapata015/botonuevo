import Pusher from 'pusher';

export default async function handler(req, res) {
  const pusher = new Pusher({
    appId: "2079081",
    key: "9d107dfd6c6872f19922",
    secret: "51d04d7d9adec62c4639",
    cluster: "mt1"
  });

  if (req.method === 'POST' && req.url.includes('/auth')) {
    const { socket_id, channel_name } = req.body;
    
    try {
      const auth = pusher.authorizeChannel(socket_id, channel_name);
      res.status(200).json(auth);
    } catch (error) {
      console.error('[v0] Auth error:', error);
      res.status(500).json({ error: error.message });
    }
  }
  else if (req.method === 'POST') {
    const { action, clientId } = req.body;

    try {
      await pusher.trigger('private-alarm-channel', 'alarm-event', {
        action: action,
        clientId: clientId,
        timestamp: new Date().toISOString()
      });
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('[v0] Pusher error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
