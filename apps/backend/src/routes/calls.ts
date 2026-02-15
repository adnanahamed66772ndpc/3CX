import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import * as repoCalls from '../db/repoCalls';
import * as repoEvents from '../db/repoEvents';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const status = req.query.status as string | undefined;
    const calls = await repoCalls.listCalls(pool, { from, to, status });
    res.json(calls);
  } catch (err) {
    console.error('GET /api/calls error:', err);
    const message = err instanceof Error ? err.message : 'Failed to list calls';
    res.status(500).json({ error: 'Failed to list calls', message });
  }
});

router.get('/:callId', async (req: Request, res: Response) => {
  try {
    const call = await repoCalls.getCall(pool, req.params.callId);
    if (!call) return res.status(404).json({ error: 'Call not found' });
    res.json(call);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get call' });
  }
});

router.get('/:callId/events', async (req: Request, res: Response) => {
  try {
    const events = await repoEvents.getEventsByCallId(pool, req.params.callId);
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

export default router;
