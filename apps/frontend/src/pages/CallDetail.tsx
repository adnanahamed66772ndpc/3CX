import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useState } from 'react';
import { getCall, getCallEvents, postAriCallsHangup } from '../api/client';
import { useSnackbar } from 'notistack';

export default function CallDetail() {
  const { callId } = useParams<{ callId: string }>();
  const [tab, setTab] = useState(0);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const { data: call, isLoading: callLoading, error: callError } = useQuery({
    queryKey: ['call', callId],
    queryFn: () => getCall(callId!),
    enabled: !!callId,
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['call-events', callId],
    queryFn: () => getCallEvents(callId!),
    enabled: !!callId,
  });

  const handleHangup = async () => {
    if (!callId) return;
    try {
      await postAriCallsHangup(callId);
      enqueueSnackbar('Hangup sent', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Hangup failed', { variant: 'error' });
    }
  };

  if (!callId) return <Typography>Missing call ID</Typography>;
  if (callLoading || callError) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/calls')}>
          Back
        </Button>
        {callError && <Typography color="error">Call not found</Typography>}
      </Box>
    );
  }
  if (!call) return null;

  const canHangup = !['ended', 'hangup_sent', 'originate_failed'].includes(call.status);

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/calls')} sx={{ mb: 2 }}>
        Back to calls
      </Button>
      <Typography variant="h5" gutterBottom>
        Call {callId}
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Call" />
        <Tab label="Events" />
      </Tabs>
      {tab === 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography component="div" variant="body2" color="textSecondary">
              Status: <Chip label={call.status} size="small" /> | A: {call.a_endpoint ?? '-'} | B: {call.b_endpoint ?? '-'}
            </Typography>
            <Typography component="div" variant="body2">
              Started: {call.started_at ? new Date(call.started_at).toLocaleString() : '-'} | Ended:{' '}
              {call.ended_at ? new Date(call.ended_at).toLocaleString() : '-'}
            </Typography>
            {canHangup && (
              <Button color="error" variant="outlined" onClick={handleHangup} sx={{ mt: 1 }}>
                Hangup
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      {tab === 1 && (
        <>
          <Typography variant="h6" gutterBottom>
            Event timeline
          </Typography>
          {eventsLoading && <Typography>Loading events...</Typography>}
          <List dense>
            {(events || []).map((ev) => (
              <ListItem key={ev.id}>
                <ListItemText
                  primary={
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      <Chip label={ev.source} size="small" sx={{ mr: 1 }} />
                      {ev.event_type} @ {new Date(ev.event_time).toLocaleString()}
                    </Box>
                  }
                  secondary={
                    <Box component="pre" sx={{ fontSize: 12, overflow: 'auto', maxHeight: 120 }}>
                      {JSON.stringify(ev.payload_json, null, 2)}
                    </Box>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Box>
  );
}
