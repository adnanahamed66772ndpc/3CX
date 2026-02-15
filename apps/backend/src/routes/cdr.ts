import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import * as repoCdr from '../db/repoCdr';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const limit = req.query.limit != null ? Number(req.query.limit) : 200;
    const rows = await repoCdr.listCdr(pool, { from, to }, limit);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list CDR' });
  }
});

export default router;
