import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import * as repoSettings from '../db/repoSettings';
import * as ariClient from '../ari/ariClient';
import * as amiClient from '../ami/amiClient';
import type { AsteriskSettings } from '../db/repoSettings';

const router = Router();

router.get('/asterisk', async (_req: Request, res: Response) => {
  try {
    const s = await repoSettings.getAsteriskSettingsForDisplay(pool);
    if (!s) {
      return res.json(null);
    }
    res.json(s);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load settings' });
  }
});

router.put('/asterisk', async (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<AsteriskSettings>;
    await repoSettings.upsertAsteriskSettings(pool, body);

    const cfg = await import('../config/asteriskConfig').then((m) =>
      Promise.all([m.getAriConfig(), m.getAmiConfig()])
    );
    const [ariCfg, amiCfg] = cfg;

    if (ariCfg) {
      await ariClient.stopAriClient();
      await ariClient.startAriClient(ariCfg).catch((e) => console.error('ARI reconnect failed:', e));
    }
    if (amiCfg) {
      await amiClient.stopAmiClient();
      await amiClient.startAmiClient(amiCfg).catch((e) => console.error('AMI reconnect failed:', e));
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save settings' });
  }
});

export default router;
