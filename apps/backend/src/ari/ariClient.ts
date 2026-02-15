// ari-client exports connect, not default
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ariConnect = require('ari-client').connect as (url: string, user: string, pass: string) => Promise<unknown>;
import { v4 as uuidv4 } from 'uuid';
import type { Pool } from 'mysql2/promise';
import pool from '../db/pool';
import * as repoCalls from '../db/repoCalls';
import * as repoEvents from '../db/repoEvents';
import { broadcastEvent, getLiveEventPayload } from '../realtime/ws';
import type { AriConfig } from '../config/asteriskConfig';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AriClientType = any;

let currentCfg: AriConfig | null = null;
let ariClientInstance: AriClientType | null = null;

interface CallState {
  aChanId?: string;
  bChanId?: string;
  bridgeId?: string;
  media?: string;
}

const calls = new Map<string, CallState>();

function assertConfig(cfg: AriConfig | null | undefined): asserts cfg is AriConfig {
  if (!cfg?.ariUser || !cfg?.ariPass) throw new Error('ARI config missing: user and password required');
}

function extractCallId(event: { args?: unknown[] }): string | null {
  const args = event?.args;
  if (Array.isArray(args) && args.length > 0 && typeof args[0] === 'string') return args[0];
  return null;
}

function safeChannel(channel: { id: string; name?: string; state?: string } | null): Record<string, unknown> | null {
  if (!channel) return null;
  return { id: channel.id, name: channel.name, state: channel.state };
}

async function hangupSafe(client: AriClientType, channelId: string): Promise<void> {
  if (!channelId) return;
  try {
    await client.channels.hangup({ channelId });
  } catch {
    // Channel may already be gone
  }
}

async function bridgeAndEntertain(
  client: AriClientType,
  callId: string,
  state: CallState,
  media?: string
): Promise<void> {
  if (!state.aChanId || !state.bChanId) return;
  const bridge = await client.bridges.create({ type: 'mixing' });
  state.bridgeId = bridge.id;

  await repoEvents.insertEvent(pool, callId, 'ari', 'BridgeCreated', { bridgeId: bridge.id });
  await repoCalls.updateCall(pool, callId, { status: 'bridging', bridge_id: bridge.id });
  broadcastEvent(getLiveEventPayload(callId, 'ari', 'BridgeCreated', new Date(), `bridge ${bridge.id}`));

  await client.bridges.addChannel({
    bridgeId: bridge.id,
    channel: `${state.aChanId},${state.bChanId}`,
  });
  await repoEvents.insertEvent(pool, callId, 'ari', 'BridgeAddChannel', {
    bridgeId: bridge.id,
    channels: [state.aChanId, state.bChanId],
  });
  await repoCalls.updateCall(pool, callId, { status: 'in_bridge' });
  broadcastEvent(getLiveEventPayload(callId, 'ari', 'BridgeAddChannel', new Date(), 'channels added'));

  const playMedia = media || 'sound:hello-world';
  const playback = client.Playback();
  playback.on('PlaybackFinished', async () => {
    await repoEvents.insertEvent(pool, callId, 'ari', 'PlaybackFinished', { playbackId: playback.id });
    await hangupSafe(client, state.aChanId!);
    await hangupSafe(client, state.bChanId!);
    await repoCalls.updateCall(pool, callId, { status: 'hangup_sent', ended_at: new Date() });
  });
  await client.channels.play({ channelId: state.aChanId, media: playMedia }, playback);
  await repoEvents.insertEvent(pool, callId, 'ari', 'PlaybackStarted', {
    playbackId: playback.id,
    channelId: state.aChanId,
    media: playMedia,
  });
}

export async function startAriClient(config?: AriConfig | null): Promise<void> {
  const cfg = config ?? (await import('../config/asteriskConfig').then((m) => m.getAriConfig()));
  assertConfig(cfg);
  currentCfg = cfg;

  const client = (await ariConnect(cfg.ariUrl, cfg.ariUser, cfg.ariPass)) as AriClientType;
  ariClientInstance = client;

  client.on('WebSocketReconnecting', (err: unknown) =>
    console.warn('ARI WS reconnecting:', err instanceof Error ? err.message : err)
  );
  client.on('WebSocketConnected', () => console.info('ARI WS connected'));
  client.on('WebSocketMaxRetries', (err: unknown) =>
    console.error('ARI WS max retries, manual intervention:', err instanceof Error ? err.message : err)
  );
  client.on('ApplicationReplaced', () => {
    console.error('ARI ApplicationReplaced: another client took over this app. Exiting.');
    process.exit(1);
  });

  client.on('StasisStart', async (event: unknown, channel: unknown) => {
    const e = event as { args?: unknown[] };
    const ch = channel as { id: string; name?: string; state?: string; answer?: () => Promise<void> };
    const callId = extractCallId(e) || uuidv4();

    await repoEvents.insertEvent(pool, callId, 'ari', 'StasisStart', {
      event: { args: e?.args },
      channel: safeChannel(ch),
    });
    await repoCalls.upsertCall(pool, callId, { status: 'in_stasis', started_at: new Date() });
    broadcastEvent(getLiveEventPayload(callId, 'ari', 'StasisStart', new Date(), ch.id));

    const state = calls.get(callId) || {};
    if (!state.aChanId) {
      state.aChanId = ch.id;
      calls.set(callId, state);
      await repoCalls.updateCall(pool, callId, { ari_channel_a_id: ch.id });
      try {
        if (typeof ch.answer === 'function') await ch.answer();
      } catch {
        // ignore
      }
      return;
    }
    if (!state.bChanId && ch.id !== state.aChanId) {
      state.bChanId = ch.id;
      calls.set(callId, state);
      await repoCalls.updateCall(pool, callId, { ari_channel_b_id: ch.id });
      await bridgeAndEntertain(client, callId, state, state.media);
    }
  });

  client.on('StasisEnd', async (event: unknown, channel: unknown) => {
    const e = event as { args?: unknown[] };
    const ch = channel as { id: string };
    const callId = extractCallId(e);
    const cid = callId || '00000000-0000-0000-0000-000000000000';
    await repoCalls.ensureCallExists(pool, cid);
    await repoEvents.insertEvent(pool, cid, 'ari', 'StasisEnd', {
      event: { args: e?.args },
      channel: safeChannel(ch),
    });
    if (callId) {
      await repoCalls.updateCall(pool, callId, { status: 'ended', ended_at: new Date() });
      broadcastEvent(getLiveEventPayload(callId, 'ari', 'StasisEnd', new Date()));
      calls.delete(callId);
    }
  });

  client.start(currentCfg.ariApp);
  console.info(`ARI app started: ${currentCfg.ariApp}`);
}

export async function stopAriClient(): Promise<void> {
  const client = ariClientInstance;
  ariClientInstance = null;
  currentCfg = null;
  if (client) {
    const c = client as unknown as { stop?: () => void };
    if (typeof c.stop === 'function') c.stop();
  }
}

export async function originateBridgePlayHangup(
  endpointA: string,
  endpointB: string,
  callerId?: string,
  media?: string
): Promise<string> {
  const client = ariClientInstance;
  if (!client) throw new Error('ARI client not started');
  const callId = uuidv4();
  const state: CallState = {};
  if (media) state.media = media;
  calls.set(callId, state);

  await repoCalls.upsertCall(pool, callId, {
    status: 'origination_requested',
    started_at: new Date(),
    a_endpoint: endpointA,
    b_endpoint: endpointB,
    caller_id: callerId ?? null,
  });

  const cfg = currentCfg;
  if (!cfg) throw new Error('ARI client not started');
  await client.channels.originate({
    endpoint: endpointA,
    app: cfg.ariApp,
    appArgs: callId,
    callerId: callerId || 'ARI-App <7000>',
    variables: { CALL_ID: callId },
  });
  await client.channels.originate({
    endpoint: endpointB,
    app: cfg.ariApp,
    appArgs: callId,
    callerId: callerId || 'ARI-App <7000>',
    variables: { CALL_ID: callId },
  });

  return callId;
}

export async function hangupCall(callId: string): Promise<boolean> {
  const client = ariClientInstance;
  if (!client) return false;
  const state = calls.get(callId);
  if (state) {
    if (state.aChanId) await hangupSafe(client, state.aChanId);
    if (state.bChanId) await hangupSafe(client, state.bChanId);
    calls.delete(callId);
  } else {
    const call = await repoCalls.getCall(pool, callId);
    if (!call) return false;
    if (call.ari_channel_a_id) await hangupSafe(client, call.ari_channel_a_id);
    if (call.ari_channel_b_id) await hangupSafe(client, call.ari_channel_b_id);
  }
  await repoCalls.updateCall(pool, callId, { status: 'ended', ended_at: new Date() });
  return true;
}
