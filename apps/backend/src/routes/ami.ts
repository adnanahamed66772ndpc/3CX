import { Router, Request, Response } from 'express';
import AmiClient from 'asterisk-ami-client';
import * as amiClient from '../ami/amiClient';
import { getAmiConfig } from '../config/asteriskConfig';

const router = Router();

/** Test AMI connection by connecting and disconnecting. */
router.post('/test', async (_req: Request, res: Response) => {
  try {
    const cfg = await getAmiConfig();
    if (!cfg?.amiUser || !cfg?.amiPass) {
      return res.status(400).json({ error: 'AMI not configured. Set AMI host, user and password in Settings.' });
    }
    const client = new AmiClient({ reconnect: false });
    await client.connect(cfg.amiUser, cfg.amiPass, { host: cfg.amiHost, port: cfg.amiPort });
    const c = client as unknown as { disconnect?: () => void };
    if (typeof c.disconnect === 'function') c.disconnect();
    res.json({ ok: true, message: 'Connected' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

router.post('/calls', async (req: Request, res: Response) => {
  try {
    const { channel, context, exten, priority, callerId, variables } = req.body as {
      channel?: string;
      context?: string;
      exten?: string;
      priority?: number;
      callerId?: string;
      variables?: Record<string, string>;
    };
    if (!channel || !context || !exten) {
      return res.status(400).json({
        error: 'channel, context, and exten are required',
      });
    }
    const callId = await amiClient.amiOriginate({
      channel,
      context,
      exten,
      priority,
      callerId,
      variables,
    });
    res.status(201).json({ callId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'AMI originate failed' });
  }
});

router.post('/hangup', async (req: Request, res: Response) => {
  try {
    const { channel } = req.body as { channel?: string };
    if (!channel) return res.status(400).json({ error: 'channel is required' });
    const actionId = await amiClient.amiHangup(channel);
    res.json({ actionId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'AMI hangup failed' });
  }
});

export default router;
