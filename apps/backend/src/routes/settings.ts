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
      try {
        await ariClient.stopAriClient();
        ariClient.startAriClient(ariCfg).catch((e) => console.error('ARI reconnect failed:', e));
      } catch (e) {
        console.error('ARI stop/start error:', e);
      }
    }
    if (amiCfg) {
      try {
        await amiClient.stopAmiClient();
        amiClient.startAmiClient(amiCfg).catch((e) => console.error('AMI reconnect failed:', e));
      } catch (e) {
        console.error('AMI stop/start error:', e);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/settings/asterisk error:', err);
    const message = err instanceof Error ? err.message : 'Failed to save settings';
    res.status(500).json({ error: 'Failed to save settings', message });
  }
});

export default router;
