// stop.js
import Pusher from "https://cdn.jsdelivr.net/npm/pusher@5.2.0/dist/web/pusher.mjs";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

export default async function handler(req, res) {
  try {
    await pusher.trigger("alarma-global", "alarma-detener", {});
    res.status(200).json({ ok: true, message: "Alarma detenida" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: "Error al detener alarma" });
  }
}
