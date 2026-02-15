import { Router, Request, Response } from 'express';
import * as ariClient from '../ari/ariClient';
import { getAriConfig } from '../config/asteriskConfig';

const router = Router();

/** Test ARI connection by fetching /ari/applications with Basic auth. */
router.post('/test', async (_req: Request, res: Response) => {
  try {
    const cfg = await getAriConfig();
    if (!cfg?.ariUser || !cfg?.ariPass) {
      return res.status(400).json({ error: 'ARI not configured. Set ARI URL, user and password in Settings.' });
    }
    const baseUrl = cfg.ariUrl.replace(/\/$/, '');
    const url = baseUrl.includes('/ari') ? `${baseUrl}/applications` : `${baseUrl}/ari/applications`;
    const auth = Buffer.from(`${cfg.ariUser}:${cfg.ariPass}`).toString('base64');
    const r = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!r.ok) {
      const text = await r.text();
      throw new Error(text || `HTTP ${r.status}`);
    }
    const apps = await r.json();
    res.json({ ok: true, applications: Array.isArray(apps) ? apps.length : 0 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

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
