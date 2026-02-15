import AmiClient from 'asterisk-ami-client';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/pool';
import * as repoCalls from '../db/repoCalls';
import * as repoEvents from '../db/repoEvents';
import { broadcastEvent, getLiveEventPayload } from '../realtime/ws';
import type { AmiConfig } from '../config/asteriskConfig';

let amiClientInstance: AmiClient | null = null;

function assertConfig(cfg: AmiConfig | null | undefined): asserts cfg is AmiConfig {
  if (!cfg?.amiUser || !cfg?.amiPass) throw new Error('AMI config missing: user and password required');
}

export async function startAmiClient(config?: AmiConfig | null): Promise<void> {
  const cfg = config ?? (await import('../config/asteriskConfig').then((m) => m.getAmiConfig()));
  assertConfig(cfg);

  const client = new AmiClient({
    reconnect: true,
    keepAlive: true,
    emitEventsByTypes: true,
    emitResponsesById: true,
  });

  await client.connect(cfg.amiUser, cfg.amiPass, { host: cfg.amiHost, port: cfg.amiPort });
  amiClientInstance = client;

  client
    .on('connect', () => console.info('AMI connected'))
    .on('disconnect', () => console.warn('AMI disconnected'))
    .on('reconnection', () => console.warn('AMI reconnecting...'))
    .on('internalError', (err: unknown) => console.error('AMI internal error', err));

  client.on('event', async (evt: unknown) => {
    const e = evt as Record<string, unknown>;
    const eventType = (e.Event || e.event || 'UnknownEvent') as string;
    const callId = await repoCalls.resolveCallIdFromAsteriskIds(
      pool,
      (e.Uniqueid as string) || null,
      (e.Linkedid as string) || null
    );
    const cid = callId || 'unknown';
    await repoEvents.insertEvent(pool, cid, 'ami', eventType, e);
    broadcastEvent(
      getLiveEventPayload(cid, 'ami', eventType, new Date(), String(e.Uniqueid || e.Linkedid || ''))
    );
  });

  client.on('Hangup', async (evt: unknown) => {
    const e = evt as Record<string, unknown>;
    const uniqueid = (e.Uniqueid as string) || null;
    const linkedid = (e.Linkedid as string) || null;
    const callId = await repoCalls.resolveCallIdFromAsteriskIds(pool, uniqueid, linkedid);
    await repoCalls.updateCallByAsteriskIds(pool, uniqueid, linkedid, {
      status: 'ended',
      ended_at: new Date(),
      hangup_cause: e.Cause != null ? Number(e.Cause) : null,
      hangup_cause_txt: (e['Cause-txt'] as string) || null,
    });
    const cid = callId || 'unknown';
    await repoEvents.insertEvent(pool, cid, 'ami', 'Hangup', e);
    broadcastEvent(getLiveEventPayload(cid, 'ami', 'Hangup', new Date(), `cause ${e.Cause || ''}`));
  });

  client.on('OriginateResponse', async (evt: unknown) => {
    const e = evt as Record<string, unknown>;
    const actionId = e.ActionID as string;
    if (!actionId) return;
    const callId = await repoCalls.resolveCallIdByActionId(pool, actionId);
    if (!callId) return;
    const response = e.Response as string;
    await repoCalls.updateCall(pool, callId, {
      status: response === 'Success' ? 'originated' : 'originate_failed',
      asterisk_uniqueid: (e.Uniqueid as string) || null,
    });
    await repoEvents.insertEvent(pool, callId, 'ami', 'OriginateResponse', e);
    broadcastEvent(
      getLiveEventPayload(callId, 'ami', 'OriginateResponse', new Date(), response || '')
    );
  });

  console.info('AMI monitoring running');
}

export async function stopAmiClient(): Promise<void> {
  const client = amiClientInstance;
  amiClientInstance = null;
  if (client) {
    const c = client as unknown as { disconnect?: () => void };
    if (typeof c.disconnect === 'function') c.disconnect();
  }
}

export interface AmiOriginateParams {
  channel: string;
  context: string;
  exten: string;
  priority?: number;
  callerId?: string;
  variables?: Record<string, string>;
}

export async function amiOriginate(params: AmiOriginateParams): Promise<string> {
  const client = amiClientInstance;
  if (!client) throw new Error('AMI client not started');
  const { channel, context, exten, priority = 1, callerId, variables = {} } = params;
  const callId = uuidv4();
  const actionId = `call_${callId}`;

  await repoCalls.upsertCall(pool, callId, {
    status: 'origination_requested',
    started_at: new Date(),
    ami_action_id: actionId,
    a_endpoint: channel,
    b_endpoint: exten,
    caller_id: callerId ?? null,
  });

  const variableHeaders = Object.entries({ CALL_ID: callId, ...variables }).map(
    ([k, v]) => `${k}=${v}`
  );
  const action: Record<string, unknown> = {
    Action: 'Originate',
    ActionID: actionId,
    Channel: channel,
    Context: context,
    Exten: exten,
    Priority: String(priority),
    Async: 'true',
  };
  if (callerId) action.CallerID = callerId;
  if (variableHeaders.length) action.Variable = variableHeaders;

  await client.action(action, false);
  return callId;
}

export async function amiHangup(channel: string): Promise<string> {
  const client = amiClientInstance;
  if (!client) throw new Error('AMI client not started');
  const actionId = `hangup_${Date.now()}`;
  await client.action({ Action: 'Hangup', ActionID: actionId, Channel: channel }, false);
  return actionId;
}
