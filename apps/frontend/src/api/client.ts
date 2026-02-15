/** Resolve API base URL. Use current host when accessed remotely (avoids CORS / private network block). */
function getApiBase(): string {
  const env = import.meta.env.VITE_API_URL || '';
  if (typeof window !== 'undefined') {
    const isLocalhost = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(window.location.host);
    const envIsLocalhost = env && /localhost|127\.0\.0\.1/.test(env);
    if (envIsLocalhost && !isLocalhost) {
      return `${window.location.protocol}//${window.location.hostname}:3000`;
    }
    return env || `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return env;
}

const BASE = getApiBase();

export interface Call {
  call_id: string;
  status: string;
  direction: string;
  a_endpoint: string | null;
  b_endpoint: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface CallEvent {
  id: number;
  call_id: string;
  source: string;
  event_type: string;
  event_time: string;
  payload_json: Record<string, unknown>;
}

export interface Stats {
  activeCalls: number;
  callsToday: number;
  failuresToday: number;
  callsPerHour: { hour_bucket: string; cnt: number }[];
}

export async function getCalls(params: { from?: string; to?: string; status?: string }): Promise<Call[]> {
  const sp = new URLSearchParams();
  if (params.from) sp.set('from', params.from);
  if (params.to) sp.set('to', params.to);
  if (params.status) sp.set('status', params.status);
  const res = await fetch(`${BASE}/api/calls?${sp}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getCall(callId: string): Promise<Call> {
  const res = await fetch(`${BASE}/api/calls/${callId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getCallEvents(callId: string): Promise<CallEvent[]> {
  const res = await fetch(`${BASE}/api/calls/${callId}/events`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getStats(): Promise<Stats> {
  const res = await fetch(`${BASE}/api/stats`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function postAriCalls(body: {
  endpointA: string;
  endpointB: string;
  callerId?: string;
  media?: string;
}): Promise<{ callId: string }> {
  const res = await fetch(`${BASE}/api/ari/calls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function postAriCallsHangup(callId: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/api/ari/calls/${callId}/hangup`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function postAmiCalls(body: {
  channel: string;
  context: string;
  exten: string;
  priority?: number;
  callerId?: string;
  variables?: Record<string, string>;
}): Promise<{ callId: string }> {
  const res = await fetch(`${BASE}/api/ami/calls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function postAmiHangup(body: { channel: string }): Promise<{ actionId: string }> {
  const res = await fetch(`${BASE}/api/ami/hangup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export interface AsteriskSettingsDisplay {
  ari_url: string | null;
  ari_user: string | null;
  ari_pass_set: boolean;
  ari_app: string | null;
  ami_host: string | null;
  ami_port: number | null;
  ami_user: string | null;
  ami_pass_set: boolean;
  ssh_host: string | null;
  ssh_port: number | null;
  ssh_user: string | null;
  ssh_pass_set: boolean;
  updated_at: string | null;
}

export interface AsteriskSettingsInput {
  ari_url?: string;
  ari_user?: string;
  ari_pass?: string;
  ari_app?: string;
  ami_host?: string;
  ami_port?: number;
  ami_user?: string;
  ami_pass?: string;
  ssh_host?: string;
  ssh_port?: number;
  ssh_user?: string;
  ssh_pass?: string;
}

export async function getAsteriskSettings(): Promise<AsteriskSettingsDisplay | null> {
  const res = await fetch(`${BASE}/api/settings/asterisk`);
  const text = await res.text();
  if (!res.ok) {
    let err = text;
    try {
      const j = text ? (JSON.parse(text) as { error?: string }) : {};
      if (j.error) err = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(err || 'Failed to load settings');
  }
  return text ? (JSON.parse(text) as AsteriskSettingsDisplay | null) : null;
}

export async function postSshTest(): Promise<{ ok: boolean; stdout?: string; stderr?: string }> {
  const res = await fetch(`${BASE}/api/ssh/test`, { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'SSH test failed');
  return data;
}

export async function putAsteriskSettings(data: AsteriskSettingsInput): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/api/settings/asterisk`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const text = await res.text();
  let body: { ok?: boolean; error?: string } = {};
  try {
    if (text) body = JSON.parse(text) as { ok?: boolean; error?: string };
  } catch {
    /* ignore */
  }
  if (!res.ok) throw new Error(body.error || text || 'Failed to save');
  return { ok: body.ok ?? true };
}

export function getLiveWsUrl(): string {
  const base = BASE;
  if (base) {
    const wsBase = base.replace(/^http/, 'ws');
    return `${wsBase}/api/live`;
  }
  const proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `${proto}//${host}:3000/api/live`;
}
