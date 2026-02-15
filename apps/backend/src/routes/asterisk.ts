import { Router, Request, Response } from 'express';
import { getSshConfig } from '../config/asteriskConfig';
import { runSshCommand } from '../ssh/sshClient';

const router = Router();

/** Parse output of "asterisk -rx \"core show channels count\"" */
function parseChannelsCount(stdout: string): { activeChannels: number; activeCalls: number; callsProcessed: number } {
  let activeChannels = 0;
  let activeCalls = 0;
  let callsProcessed = 0;
  for (const line of stdout.split('\n')) {
    const m1 = line.match(/^\s*(\d+)\s+active\s+channels?/i);
    if (m1) activeChannels = parseInt(m1[1], 10);
    const m2 = line.match(/^\s*(\d+)\s+active\s+call/i);
    if (m2) activeCalls = parseInt(m2[1], 10);
    const m3 = line.match(/^\s*(\d+)\s+calls?\s+processed/i);
    if (m3) callsProcessed = parseInt(m3[1], 10);
  }
  return { activeChannels, activeCalls, callsProcessed };
}

/** GET channel stats from Asterisk (requires SSH configured). */
router.get('/channel-stats', async (_req: Request, res: Response) => {
  try {
    const cfg = await getSshConfig();
    if (!cfg) {
      return res.status(400).json({
        error: 'SSH not configured',
        message: 'Set SSH host, user and password in Settings to show Asterisk channel stats.',
      });
    }
    const { stdout } = await runSshCommand(cfg, 'asterisk -rx "core show channels count"');
    const stats = parseChannelsCount(stdout);
    res.json(stats);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

export default router;
