import type { Pool } from 'mysql2/promise';
import {
  upsertCall,
  updateCall,
  getCall,
  listCalls,
  resolveCallIdByActionId,
  resolveCallIdFromAsteriskIds,
  updateCallByAsteriskIds,
} from './repoCalls';

function mockPool(execute: (sql: string, values?: unknown[]) => Promise<unknown[]>): Pool {
  return {
    execute: async (sql: string, values?: unknown[]) => {
      const rows = await execute(sql, values);
      return [rows];
    },
  } as unknown as Pool;
}

describe('repoCalls', () => {
  it('upsertCall runs INSERT with correct params', async () => {
    let lastSql = '';
    let lastValues: unknown[] = [];
    const pool = mockPool(async (sql, values) => {
      lastSql = sql;
      lastValues = values || [];
      return [];
    });
    await upsertCall(pool, 'call-1', {
      status: 'new',
      started_at: new Date('2025-01-01T12:00:00Z'),
      a_endpoint: 'PJSIP/1001',
      b_endpoint: 'PJSIP/1002',
    });
    expect(lastSql).toContain('INSERT INTO calls');
    expect(lastSql).toContain('ON DUPLICATE KEY UPDATE');
    expect(lastValues[0]).toBe('call-1');
    expect(lastValues[1]).toBe('new');
    expect(lastValues[9]).toBe('PJSIP/1001');
    expect(lastValues[10]).toBe('PJSIP/1002');
  });

  it('updateCall runs UPDATE with allowed fields', async () => {
    let lastSql = '';
    const pool = mockPool(async (sql) => {
      lastSql = sql;
      return [];
    });
    await updateCall(pool, 'call-1', { status: 'ended', ended_at: new Date() });
    expect(lastSql).toContain('UPDATE calls SET');
    expect(lastSql).toContain('status = ?');
    expect(lastSql).toContain('ended_at = ?');
    expect(lastSql).toContain('updated_at = ?');
    expect(lastSql).toContain('WHERE call_id = ?');
  });

  it('getCall returns null when no row', async () => {
    const pool = mockPool(async () => []);
    const call = await getCall(pool, 'missing');
    expect(call).toBeNull();
  });

  it('getCall returns call when row exists', async () => {
    const row = {
      call_id: 'c1',
      status: 'ended',
      direction: 'internal',
      asterisk_uniqueid: null,
      asterisk_linkedid: null,
      ami_action_id: null,
      ari_channel_a_id: null,
      ari_channel_b_id: null,
      bridge_id: null,
      a_endpoint: 'PJSIP/1001',
      b_endpoint: 'PJSIP/1002',
      caller_id: null,
      started_at: new Date(),
      answered_at: null,
      ended_at: null,
      hangup_cause: null,
      hangup_cause_txt: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    const pool = mockPool(async () => [row]);
    const call = await getCall(pool, 'c1');
    expect(call).not.toBeNull();
    expect(call?.call_id).toBe('c1');
    expect(call?.a_endpoint).toBe('PJSIP/1001');
  });

  it('listCalls runs SELECT with filters', async () => {
    let lastSql = '';
    const pool = mockPool(async (sql) => {
      lastSql = sql;
      return [];
    });
    await listCalls(pool, { from: '2025-01-01', status: 'ended' }, 50);
    expect(lastSql).toContain('SELECT * FROM calls');
    expect(lastSql).toContain('started_at >= ?');
    expect(lastSql).toContain('status = ?');
    expect(lastSql).toContain('ORDER BY started_at DESC');
    expect(lastSql).toContain('LIMIT ?');
  });

  it('resolveCallIdByActionId returns call_id when found', async () => {
    const pool = mockPool(async () => [{ call_id: 'resolved-call' }]);
    const id = await resolveCallIdByActionId(pool, 'action-123');
    expect(id).toBe('resolved-call');
  });

  it('resolveCallIdByActionId returns null when not found', async () => {
    const pool = mockPool(async () => []);
    const id = await resolveCallIdByActionId(pool, 'action-123');
    expect(id).toBeNull();
  });

  it('resolveCallIdFromAsteriskIds returns null when both ids missing', async () => {
    const id = await resolveCallIdFromAsteriskIds(mockPool(async () => []), null, null);
    expect(id).toBeNull();
  });

  it('updateCallByAsteriskIds does nothing when both ids missing', async () => {
    const pool = mockPool(async () => []);
    await updateCallByAsteriskIds(pool, null, null, { status: 'ended' });
    // Just ensure no throw
  });
});
