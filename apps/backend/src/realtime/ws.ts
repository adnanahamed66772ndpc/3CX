import { WebSocketServer, WebSocket } from 'ws';
import type { NormalizedLiveEvent } from '../types';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export function broadcastEvent(event: NormalizedLiveEvent): void {
  const payload = JSON.stringify(event);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

export function attachWebSocketServer(server: import('http').Server): void {
  wss = new WebSocketServer({ server, path: '/api/live' });
  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
  });
}

export function getLiveEventPayload(
  callId: string,
  source: 'ari' | 'ami',
  eventType: string,
  eventTime: Date,
  summary?: string
): NormalizedLiveEvent {
  return {
    callId,
    source,
    eventType,
    eventTime: eventTime.toISOString(),
    summary,
  };
}
