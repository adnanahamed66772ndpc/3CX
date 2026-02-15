import { Router, Request, Response } from 'express';
import { getSshConfig } from '../config/asteriskConfig';
import { runSshCommand } from '../ssh/sshClient';

const router = Router();

/** Test SSH connection by running a simple command (whoami or hostname). */
router.post('/test', async (_req: Request, res: Response) => {
  try {
    const cfg = await getSshConfig();
    if (!cfg) {
      return res.status(400).json({ error: 'SSH not configured. Set SSH host, user and password in Settings.' });
    }
    const { stdout, stderr } = await runSshCommand(cfg, 'hostname');
    res.json({ ok: true, stdout: stdout.trim(), stderr: stderr.trim() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

export default router;
