import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { Call, ListCallsFilters } from '../types';

export async function upsertCall(
  pool: Pool,
  callId: string,
  fields: Partial<Call>
): Promise<void> {
  const now = new Date();
  const status = fields.status || 'new';
  const startedAt = fields.started_at || null;
  await pool.execute(
    `INSERT INTO calls (
      call_id, status, direction, asterisk_uniqueid, asterisk_linkedid,
      ami_action_id, ari_channel_a_id, ari_channel_b_id, bridge_id,
      a_endpoint, b_endpoint, caller_id, started_at, answered_at, ended_at,
      hangup_cause, hangup_cause_txt, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      status = COALESCE(VALUES(status), status),
      direction = COALESCE(VALUES(direction), direction),
      asterisk_uniqueid = COALESCE(VALUES(asterisk_uniqueid), asterisk_uniqueid),
      asterisk_linkedid = COALESCE(VALUES(asterisk_linkedid), asterisk_linkedid),
      ami_action_id = COALESCE(VALUES(ami_action_id), ami_action_id),
      ari_channel_a_id = COALESCE(VALUES(ari_channel_a_id), ari_channel_a_id),
      ari_channel_b_id = COALESCE(VALUES(ari_channel_b_id), ari_channel_b_id),
      bridge_id = COALESCE(VALUES(bridge_id), bridge_id),
      a_endpoint = COALESCE(VALUES(a_endpoint), a_endpoint),
      b_endpoint = COALESCE(VALUES(b_endpoint), b_endpoint),
      caller_id = COALESCE(VALUES(caller_id), caller_id),
      started_at = COALESCE(VALUES(started_at), started_at),
      answered_at = COALESCE(VALUES(answered_at), answered_at),
      ended_at = COALESCE(VALUES(ended_at), ended_at),
      hangup_cause = COALESCE(VALUES(hangup_cause), hangup_cause),
      hangup_cause_txt = COALESCE(VALUES(hangup_cause_txt), hangup_cause_txt),
      updated_at = VALUES(updated_at)`,
    [
      callId,
      status,
      fields.direction || 'unknown',
      fields.asterisk_uniqueid ?? null,
      fields.asterisk_linkedid ?? null,
      fields.ami_action_id ?? null,
      fields.ari_channel_a_id ?? null,
      fields.ari_channel_b_id ?? null,
      fields.bridge_id ?? null,
      fields.a_endpoint ?? null,
      fields.b_endpoint ?? null,
      fields.caller_id ?? null,
      startedAt,
      fields.answered_at ?? null,
      fields.ended_at ?? null,
      fields.hangup_cause ?? null,
      fields.hangup_cause_txt ?? null,
      now,
      now,
    ]
  );
}

export async function updateCall(
  pool: Pool,
  callId: string,
  fields: Partial<Call>
): Promise<void> {
  const cols: string[] = [];
  const vals: unknown[] = [];
  const allowed = [
    'status', 'direction', 'asterisk_uniqueid', 'asterisk_linkedid',
    'ami_action_id', 'ari_channel_a_id', 'ari_channel_b_id', 'bridge_id',
    'a_endpoint', 'b_endpoint', 'caller_id', 'started_at', 'answered_at',
    'ended_at', 'hangup_cause', 'hangup_cause_txt',
  ];
  for (const k of allowed) {
    const v = (fields as Record<string, unknown>)[k];
    if (v !== undefined) {
      cols.push(`${k} = ?`);
      vals.push(v);
    }
  }
  if (cols.length === 0) return;
  cols.push('updated_at = ?');
  vals.push(new Date(), callId);
  await pool.execute(
    `UPDATE calls SET ${cols.join(', ')} WHERE call_id = ?`,
    vals
  );
}

export async function updateCallByAsteriskIds(
  pool: Pool,
  uniqueid: string | null,
  linkedid: string | null,
  fields: Partial<Call>
): Promise<void> {
  if (!uniqueid && !linkedid) return;
  const cols: string[] = [];
  const vals: unknown[] = [];
  const allowed = [
    'status', 'ended_at', 'hangup_cause', 'hangup_cause_txt',
  ];
  for (const k of allowed) {
    const v = (fields as Record<string, unknown>)[k];
    if (v !== undefined) {
      cols.push(`${k} = ?`);
      vals.push(v);
    }
  }
  if (cols.length === 0) return;
  cols.push('updated_at = ?');
  vals.push(new Date());
  if (linkedid) {
    vals.push(linkedid);
    await pool.execute(
      `UPDATE calls SET ${cols.join(', ')} WHERE asterisk_linkedid = ?`,
      vals
    );
  } else if (uniqueid) {
    vals.push(uniqueid);
    await pool.execute(
      `UPDATE calls SET ${cols.join(', ')} WHERE asterisk_uniqueid = ?`,
      vals
    );
  }
}

export async function getCall(pool: Pool, callId: string): Promise<Call | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM calls WHERE call_id = ? LIMIT 1',
    [callId]
  );
  const r = rows?.[0];
  if (!r) return null;
  return rowToCall(r);
}

export async function listCalls(
  pool: Pool,
  filters: ListCallsFilters,
  limit = 200
): Promise<Call[]> {
  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];
  if (filters.from) {
    conditions.push('started_at >= ?');
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push('started_at <= ?');
    params.push(filters.to);
  }
  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  const safeLimit = Math.min(Math.max(1, Number(limit) || 200), 1000);
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM calls WHERE ${conditions.join(' AND ')} ORDER BY started_at DESC LIMIT ${safeLimit}`,
    params
  );
  return (rows || []).map(rowToCall);
}

export async function resolveCallIdByActionId(
  pool: Pool,
  actionId: string
): Promise<string | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT call_id FROM calls WHERE ami_action_id = ? LIMIT 1',
    [actionId]
  );
  return rows?.[0]?.call_id ?? null;
}

/** Ensure a call row exists for the given call_id (e.g. for unknown/AMI-only calls). */
export async function ensureCallExists(
  pool: Pool,
  callId: string
): Promise<void> {
  await upsertCall(pool, callId, {
    status: 'unknown',
    direction: 'unknown',
    started_at: new Date(),
  });
}

export async function resolveCallIdFromAsteriskIds(
  pool: Pool,
  uniqueid: string | null,
  linkedid: string | null
): Promise<string | null> {
  if (!uniqueid && !linkedid) return null;
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT call_id FROM calls WHERE asterisk_uniqueid = ? OR asterisk_linkedid = ? LIMIT 1',
    [uniqueid, linkedid]
  );
  return rows?.[0]?.call_id ?? null;
}

function rowToCall(r: RowDataPacket): Call {
  return {
    call_id: r.call_id,
    status: r.status,
    direction: r.direction,
    asterisk_uniqueid: r.asterisk_uniqueid,
    asterisk_linkedid: r.asterisk_linkedid,
    ami_action_id: r.ami_action_id,
    ari_channel_a_id: r.ari_channel_a_id,
    ari_channel_b_id: r.ari_channel_b_id,
    bridge_id: r.bridge_id,
    a_endpoint: r.a_endpoint,
    b_endpoint: r.b_endpoint,
    caller_id: r.caller_id,
    started_at: r.started_at,
    answered_at: r.answered_at,
    ended_at: r.ended_at,
    hangup_cause: r.hangup_cause,
    hangup_cause_txt: r.hangup_cause_txt,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}
