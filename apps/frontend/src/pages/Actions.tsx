import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Tabs,
  Tab,
  Stack,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import {
  postAriCalls,
  postAriCallsHangup,
  postAmiCalls,
  postAmiHangup,
} from '../api/client';

export default function Actions() {
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);

  const [ariA, setAriA] = useState('PJSIP/1001');
  const [ariB, setAriB] = useState('PJSIP/1002');
  const [ariCallerId, setAriCallerId] = useState('');
  const [ariMedia, setAriMedia] = useState('');
  const [ariHangupCallId, setAriHangupCallId] = useState('');

  const [amiChannel, setAmiChannel] = useState('PJSIP/1001');
  const [amiContext, setAmiContext] = useState('internal');
  const [amiExten, setAmiExten] = useState('1002');
  const [amiCallerId, setAmiCallerId] = useState('');
  const [amiHangupChannel, setAmiHangupChannel] = useState('');

  const handleAriOriginate = async () => {
    try {
      const { callId } = await postAriCalls({
        endpointA: ariA,
        endpointB: ariB,
        callerId: ariCallerId || undefined,
        media: ariMedia || undefined,
      });
      enqueueSnackbar(`ARI call started: ${callId}`, { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'ARI originate failed', { variant: 'error' });
    }
  };

  const handleAriHangup = async () => {
    try {
      await postAriCallsHangup(ariHangupCallId);
      enqueueSnackbar('Hangup sent', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Hangup failed', { variant: 'error' });
    }
  };

  const handleAmiOriginate = async () => {
    try {
      const { callId } = await postAmiCalls({
        channel: amiChannel,
        context: amiContext,
        exten: amiExten,
        callerId: amiCallerId || undefined,
      });
      enqueueSnackbar(`AMI call started: ${callId}`, { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'AMI originate failed', { variant: 'error' });
    }
  };

  const handleAmiHangup = async () => {
    try {
      await postAmiHangup({ channel: amiHangupChannel });
      enqueueSnackbar('Hangup action sent', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'AMI hangup failed', { variant: 'error' });
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Actions
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="ARI originate" />
        <Tab label="ARI hangup" />
        <Tab label="AMI originate" />
        <Tab label="AMI hangup" />
      </Tabs>

      {tab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              ARI: Bridge two endpoints
            </Typography>
            <Stack spacing={2} maxWidth={400}>
              <TextField
                fullWidth
                size="small"
                label="Endpoint A"
                value={ariA}
                onChange={(e) => setAriA(e.target.value)}
                placeholder="PJSIP/1001"
              />
              <TextField
                fullWidth
                size="small"
                label="Endpoint B"
                value={ariB}
                onChange={(e) => setAriB(e.target.value)}
                placeholder="PJSIP/1002"
              />
              <TextField
                fullWidth
                size="small"
                label="Caller ID (optional)"
                value={ariCallerId}
                onChange={(e) => setAriCallerId(e.target.value)}
              />
              <TextField
                fullWidth
                size="small"
                label="Media (optional, e.g. sound:hello-world)"
                value={ariMedia}
                onChange={(e) => setAriMedia(e.target.value)}
              />
              <Button variant="contained" onClick={handleAriOriginate}>
                Originate and bridge
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              ARI: Hangup by call ID
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                size="small"
                label="Call ID"
                value={ariHangupCallId}
                onChange={(e) => setAriHangupCallId(e.target.value)}
                placeholder="UUID from ARI call"
                sx={{ minWidth: 320 }}
              />
              <Button variant="contained" color="error" onClick={handleAriHangup}>
                Hangup
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {tab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              AMI: Originate (channel → context/exten)
            </Typography>
            <Stack spacing={2} maxWidth={400}>
              <TextField
                fullWidth
                size="small"
                label="Channel"
                value={amiChannel}
                onChange={(e) => setAmiChannel(e.target.value)}
                placeholder="PJSIP/1001"
              />
              <TextField
                fullWidth
                size="small"
                label="Context"
                value={amiContext}
                onChange={(e) => setAmiContext(e.target.value)}
              />
              <TextField
                fullWidth
                size="small"
                label="Exten"
                value={amiExten}
                onChange={(e) => setAmiExten(e.target.value)}
              />
              <TextField
                fullWidth
                size="small"
                label="Caller ID (optional)"
                value={amiCallerId}
                onChange={(e) => setAmiCallerId(e.target.value)}
              />
              <Button variant="contained" onClick={handleAmiOriginate}>
                Originate
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {tab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              AMI: Hangup by channel
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                size="small"
                label="Channel (or regex)"
                value={amiHangupChannel}
                onChange={(e) => setAmiHangupChannel(e.target.value)}
                placeholder="PJSIP/1001-00000001"
                sx={{ minWidth: 280 }}
              />
              <Button variant="contained" color="error" onClick={handleAmiHangup}>
                Hangup
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
