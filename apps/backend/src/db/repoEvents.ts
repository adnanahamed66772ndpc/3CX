import type { Pool } from 'mysql2/promise';
import type { CallEvent, EventSource } from '../types';

export async function insertEvent(
  pool: Pool,
  callId: string,
  source: EventSource,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  await pool.execute(
    `INSERT INTO call_events (call_id, source, event_type, event_time, payload_json)
     VALUES (?, ?, ?, ?, ?)`,
    [callId, source, eventType, new Date(), JSON.stringify(payload)]
  );
}

export async function getEventsByCallId(
  pool: Pool,
  callId: string
): Promise<CallEvent[]> {
  const [rows] = await pool.execute<import('mysql2/promise').RowDataPacket[]>(
    `SELECT id, call_id, source, event_type, event_time, payload_json
     FROM call_events WHERE call_id = ? ORDER BY event_time ASC`,
    [callId]
  );
  return (rows || []).map((r) => ({
    id: r.id,
    call_id: r.call_id,
    source: r.source,
    event_type: r.event_type,
    event_time: r.event_time,
    payload_json: typeof r.payload_json === 'string' ? JSON.parse(r.payload_json) : r.payload_json,
  }));
}
