import type { Pool } from 'mysql2/promise';
import { insertEvent, getEventsByCallId } from './repoEvents';

function mockPool(execute: (sql: string, values?: unknown[]) => Promise<unknown>): Pool {
  return {
    execute: async (sql: string, values?: unknown[]) => {
      const result = await execute(sql, values);
      return [result];
    },
  } as unknown as Pool;
}

describe('repoEvents', () => {
  it('insertEvent runs INSERT with call_id, source, event_type, payload', async () => {
    let lastSql = '';
    let lastValues: unknown[] = [];
    const pool = mockPool(async (sql, values) => {
      lastSql = sql;
      lastValues = values || [];
      return [];
    });
    await insertEvent(pool, 'call-1', 'ari', 'StasisStart', { channel: 'ch-1' });
    expect(lastSql).toContain('INSERT INTO call_events');
    expect(lastValues[0]).toBe('call-1');
    expect(lastValues[1]).toBe('ari');
    expect(lastValues[2]).toBe('StasisStart');
    expect(JSON.parse(lastValues[4] as string)).toEqual({ channel: 'ch-1' });
  });

  it('getEventsByCallId returns events ordered by event_time', async () => {
    const rows = [
      {
        id: 1,
        call_id: 'c1',
        source: 'ari',
        event_type: 'StasisStart',
        event_time: new Date('2025-01-01T12:00:00Z'),
        payload_json: JSON.stringify({ x: 1 }),
      },
    ];
    const pool = mockPool(async () => rows);
    const events = await getEventsByCallId(pool, 'c1');
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe('StasisStart');
    expect(events[0].payload_json).toEqual({ x: 1 });
  });
});
