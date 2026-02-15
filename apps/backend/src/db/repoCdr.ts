import type { Pool, RowDataPacket } from 'mysql2/promise';

/** Run on startup so existing DBs get the cdr table (migration 004). */
export async function ensureCdrTable(pool: Pool): Promise<void> {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS cdr (
      id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uniqueid          VARCHAR(64) NOT NULL,
      calldate          DATETIME(3) NOT NULL,
      src               VARCHAR(80) NULL,
      dst               VARCHAR(80) NULL,
      duration          INT UNSIGNED NOT NULL DEFAULT 0,
      billsec           INT UNSIGNED NOT NULL DEFAULT 0,
      disposition       VARCHAR(32) NULL,
      channel           VARCHAR(255) NULL,
      dstchannel        VARCHAR(255) NULL,
      created_at        DATETIME(3) NOT NULL,
      UNIQUE KEY uq_cdr_uniqueid (uniqueid),
      KEY idx_calldate (calldate),
      KEY idx_src_dst (src, dst)
    ) ENGINE=InnoDB
  `);
}

export interface CdrRow {
  id: number;
  uniqueid: string;
  calldate: Date;
  src: string | null;
  dst: string | null;
  duration: number;
  billsec: number;
  disposition: string | null;
  channel: string | null;
  dstchannel: string | null;
  created_at: Date;
}

export async function insertCdr(
  pool: Pool,
  row: {
    uniqueid: string;
    calldate: Date;
    src?: string | null;
    dst?: string | null;
    duration?: number;
    billsec?: number;
    disposition?: string | null;
    channel?: string | null;
    dstchannel?: string | null;
  }
): Promise<void> {
  const now = new Date();
  await pool.execute(
    `INSERT INTO cdr (uniqueid, calldate, src, dst, duration, billsec, disposition, channel, dstchannel, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       calldate = VALUES(calldate),
       src = VALUES(src),
       dst = VALUES(dst),
       duration = VALUES(duration),
       billsec = VALUES(billsec),
       disposition = VALUES(disposition),
       channel = VALUES(channel),
       dstchannel = VALUES(dstchannel)`,
    [
      row.uniqueid,
      row.calldate,
      row.src ?? null,
      row.dst ?? null,
      row.duration ?? 0,
      row.billsec ?? 0,
      row.disposition ?? null,
      row.channel ?? null,
      row.dstchannel ?? null,
      now,
    ]
  );
}

export interface ListCdrFilters {
  from?: string;
  to?: string;
}

export async function listCdr(
  pool: Pool,
  filters: ListCdrFilters,
  limit = 200
): Promise<CdrRow[]> {
  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];
  if (filters.from) {
    conditions.push('calldate >= ?');
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push('calldate <= ?');
    params.push(filters.to);
  }
  const safeLimit = Math.min(Math.max(1, Number(limit) || 200), 1000);
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, uniqueid, calldate, src, dst, duration, billsec, disposition, channel, dstchannel, created_at
     FROM cdr WHERE ${conditions.join(' AND ')} ORDER BY calldate DESC LIMIT ${safeLimit}`,
    params
  );
  return (rows || []).map(rowToCdr);
}

function rowToCdr(r: RowDataPacket): CdrRow {
  return {
    id: r.id,
    uniqueid: r.uniqueid,
    calldate: r.calldate,
    src: r.src,
    dst: r.dst,
    duration: r.duration ?? 0,
    billsec: r.billsec ?? 0,
    disposition: r.disposition,
    channel: r.channel,
    dstchannel: r.dstchannel,
    created_at: r.created_at,
  };
}
