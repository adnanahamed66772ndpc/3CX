export type CallDirection = 'inbound' | 'outbound' | 'internal' | 'unknown';
export type EventSource = 'ari' | 'ami' | 'app';

export interface Call {
  call_id: string;
  status: string;
  direction: CallDirection;
  asterisk_uniqueid: string | null;
  asterisk_linkedid: string | null;
  ami_action_id: string | null;
  ari_channel_a_id: string | null;
  ari_channel_b_id: string | null;
  bridge_id: string | null;
  a_endpoint: string | null;
  b_endpoint: string | null;
  caller_id: string | null;
  started_at: Date | null;
  answered_at: Date | null;
  ended_at: Date | null;
  hangup_cause: number | null;
  hangup_cause_txt: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CallEvent {
  id: number;
  call_id: string;
  source: EventSource;
  event_type: string;
  event_time: Date;
  payload_json: Record<string, unknown> | string;
}

export interface ListCallsFilters {
  from?: string;
  to?: string;
  status?: string;
}

export interface NormalizedLiveEvent {
  callId: string;
  source: 'ari' | 'ami';
  eventType: string;
  eventTime: string;
  summary?: string;
}
