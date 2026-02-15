import { Router, Request, Response } from 'express';
import * as ariClient from '../ari/ariClient';

const router = Router();

router.post('/calls', async (req: Request, res: Response) => {
  try {
    const { endpointA, endpointB, callerId, media } = req.body as {
      endpointA?: string;
      endpointB?: string;
      callerId?: string;
      media?: string;
    };
    if (!endpointA || !endpointB) {
      return res.status(400).json({ error: 'endpointA and endpointB are required' });
    }
    const callId = await ariClient.originateBridgePlayHangup(
      endpointA,
      endpointB,
      callerId,
      media
    );
    res.status(201).json({ callId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'ARI originate failed' });
  }
});

router.post('/calls/:callId/hangup', async (req: Request, res: Response) => {
  try {
    const ok = await ariClient.hangupCall(req.params.callId);
    if (!ok) return res.status(404).json({ error: 'Call not found or already ended' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Hangup failed' });
  }
});

export default router;
