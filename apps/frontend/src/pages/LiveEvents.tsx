import { useEffect, useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Chip } from '@mui/material';
import { getLiveWsUrl } from '../api/client';

interface LiveEvent {
  callId: string;
  source: 'ari' | 'ami';
  eventType: string;
  eventTime: string;
  summary?: string;
}

export default function LiveEvents() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const url = getLiveWsUrl();
    const ws = new WebSocket(url);
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as LiveEvent;
        setEvents((prev) => [ev, ...prev].slice(0, 200));
      } catch {
        // ignore
      }
    };
    return () => ws.close();
  }, []);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Live events
      </Typography>
      <Chip
        label={connected ? 'Connected' : 'Disconnected'}
        color={connected ? 'success' : 'default'}
        size="small"
        sx={{ mb: 2 }}
      />
      <List dense sx={{ maxHeight: '70vh', overflow: 'auto' }}>
        {events.map((ev, i) => (
          <ListItem key={`${ev.eventTime}-${i}`}>
            <ListItemText
              primary={
                <>
                  <Chip label={ev.source} size="small" sx={{ mr: 1 }} />
                  {ev.eventType}
                  {ev.summary && ` — ${ev.summary}`}
                </>
              }
              secondary={`${ev.callId} @ ${new Date(ev.eventTime).toLocaleTimeString()}`}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
