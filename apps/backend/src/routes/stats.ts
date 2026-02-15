import { Router, Request, Response } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../db/pool';
import { getAmiActiveCallCount } from '../ami/amiClient';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 19).replace('T', ' ');

    const [activeRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM calls WHERE status NOT IN ('ended', 'hangup_sent', 'originate_failed') AND started_at >= ?`,
      [todayStr]
    );
    const [todayRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM calls WHERE started_at >= ?`,
      [todayStr]
    );
    const [failRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM calls WHERE status = 'originate_failed' AND started_at >= ?`,
      [todayStr]
    );
    const [hourRows] = await pool.execute<RowDataPacket[]>(
      `SELECT DATE_FORMAT(started_at, '%Y-%m-%d %H:00') AS hour_bucket, COUNT(*) AS cnt
       FROM calls WHERE started_at >= NOW() - INTERVAL 24 HOUR
       GROUP BY hour_bucket ORDER BY hour_bucket`
    );

    res.json({
      activeCalls: (activeRows?.[0] as { count: number })?.count ?? 0,
      amiActiveCalls: getAmiActiveCallCount(),
      callsToday: (todayRows?.[0] as { count: number })?.count ?? 0,
      failuresToday: (failRows?.[0] as { count: number })?.count ?? 0,
      callsPerHour: (hourRows as { hour_bucket: string; cnt: number }[]) || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
