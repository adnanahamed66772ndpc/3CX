import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Stack,
  Alert,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  getAsteriskSettings,
  putAsteriskSettings,
  postSshTest,
  type AsteriskSettingsDisplay,
  type AsteriskSettingsInput,
} from '../api/client';

type SshTestStatus = 'idle' | 'testing' | 'connected' | 'failed';

export default function Settings() {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<AsteriskSettingsInput>({});
  const [initial, setInitial] = useState<AsteriskSettingsDisplay | null>(null);
  const [sshTestStatus, setSshTestStatus] = useState<SshTestStatus>('idle');
  const [sshTestMessage, setSshTestMessage] = useState<string>('');

  useEffect(() => {
    getAsteriskSettings()
      .then((s) => {
        setInitial(s);
        if (s) {
          setData({
            ari_url: s.ari_url ?? '',
            ari_user: s.ari_user ?? '',
            ari_pass: '',
            ari_app: s.ari_app ?? '',
            ami_host: s.ami_host ?? '',
            ami_port: s.ami_port ?? 5038,
            ami_user: s.ami_user ?? '',
            ami_pass: '',
            ssh_host: s.ssh_host ?? '',
            ssh_port: s.ssh_port ?? 22,
            ssh_user: s.ssh_user ?? '',
            ssh_pass: '',
          });
        } else {
          setData({
            ari_url: 'http://127.0.0.1:8088',
            ari_user: '',
            ari_pass: '',
            ari_app: 'myapp',
            ami_host: '127.0.0.1',
            ami_port: 5038,
            ami_user: '',
            ami_pass: '',
            ssh_host: '',
            ssh_port: 22,
            ssh_user: '',
            ssh_pass: '',
          });
        }
      })
      .catch((e) => enqueueSnackbar(e instanceof Error ? e.message : 'Failed to load settings', { variant: 'error' }))
      .finally(() => setLoading(false));
  }, [enqueueSnackbar]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: AsteriskSettingsInput = {
        ari_url: data.ari_url || undefined,
        ari_user: data.ari_user || undefined,
        ari_app: data.ari_app || undefined,
        ami_host: data.ami_host || undefined,
        ami_port: data.ami_port,
        ami_user: data.ami_user || undefined,
        ssh_host: data.ssh_host || undefined,
        ssh_port: data.ssh_port,
        ssh_user: data.ssh_user || undefined,
      };
      if (data.ari_pass) payload.ari_pass = data.ari_pass;
      if (data.ami_pass) payload.ami_pass = data.ami_pass;
      if (data.ssh_pass) payload.ssh_pass = data.ssh_pass;
      await putAsteriskSettings(payload);
      enqueueSnackbar('Settings saved. ARI and AMI reconnecting.', { variant: 'success' });
      const s = await getAsteriskSettings();
      setInitial(s);
      setData((d) => ({ ...d, ari_pass: '', ami_pass: '', ssh_pass: '' }));
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Failed to save', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SettingsIcon /> ARI, AMI & SSH Settings
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        Configure Asterisk ARI, AMI and SSH. SSH is used to create/update configs on the Asterisk server from this panel. Saved values override .env. Leave password blank to keep current.
      </Alert>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            ARI (REST + WebSocket)
          </Typography>
          <Stack spacing={2} maxWidth={500}>
            <TextField
              fullWidth
              size="small"
              label="ARI URL"
              value={data.ari_url ?? ''}
              onChange={(e) => setData((d) => ({ ...d, ari_url: e.target.value }))}
              placeholder="http://127.0.0.1:8088"
            />
            <TextField
              fullWidth
              size="small"
              label="ARI User"
              value={data.ari_user ?? ''}
              onChange={(e) => setData((d) => ({ ...d, ari_user: e.target.value }))}
              placeholder="myariuser"
            />
            <TextField
              fullWidth
              size="small"
              type="password"
              label="ARI Password"
              value={data.ari_pass ?? ''}
              onChange={(e) => setData((d) => ({ ...d, ari_pass: e.target.value }))}
              placeholder={initial?.ari_pass_set ? '•••••••• (unchanged)' : ''}
              helperText={initial?.ari_pass_set ? 'Leave blank to keep current' : undefined}
            />
            <TextField
              fullWidth
              size="small"
              label="ARI App"
              value={data.ari_app ?? ''}
              onChange={(e) => setData((d) => ({ ...d, ari_app: e.target.value }))}
              placeholder="myapp"
            />
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            AMI
          </Typography>
          <Stack spacing={2} maxWidth={500}>
            <TextField
              fullWidth
              size="small"
              label="AMI Host"
              value={data.ami_host ?? ''}
              onChange={(e) => setData((d) => ({ ...d, ami_host: e.target.value }))}
              placeholder="127.0.0.1"
            />
            <TextField
              fullWidth
              size="small"
              type="number"
              label="AMI Port"
              value={data.ami_port ?? 5038}
              onChange={(e) => setData((d) => ({ ...d, ami_port: Number(e.target.value) || 5038 }))}
            />
            <TextField
              fullWidth
              size="small"
              label="AMI User"
              value={data.ami_user ?? ''}
              onChange={(e) => setData((d) => ({ ...d, ami_user: e.target.value }))}
              placeholder="myamiuser"
            />
            <TextField
              fullWidth
              size="small"
              type="password"
              label="AMI Password"
              value={data.ami_pass ?? ''}
              onChange={(e) => setData((d) => ({ ...d, ami_pass: e.target.value }))}
              placeholder={initial?.ami_pass_set ? '•••••••• (unchanged)' : ''}
              helperText={initial?.ami_pass_set ? 'Leave blank to keep current' : undefined}
            />
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            SSH (for remote Asterisk config)
          </Typography>
          <Stack spacing={2} maxWidth={500}>
            <TextField
              fullWidth
              size="small"
              label="SSH Host"
              value={data.ssh_host ?? ''}
              onChange={(e) => setData((d) => ({ ...d, ssh_host: e.target.value }))}
              placeholder="103.187.23.17"
            />
            <TextField
              fullWidth
              size="small"
              type="number"
              label="SSH Port"
              value={data.ssh_port ?? 22}
              onChange={(e) => setData((d) => ({ ...d, ssh_port: Number(e.target.value) || 22 }))}
            />
            <TextField
              fullWidth
              size="small"
              label="SSH User"
              value={data.ssh_user ?? ''}
              onChange={(e) => setData((d) => ({ ...d, ssh_user: e.target.value }))}
              placeholder="root"
            />
            <TextField
              fullWidth
              size="small"
              type="password"
              label="SSH Password"
              value={data.ssh_pass ?? ''}
              onChange={(e) => setData((d) => ({ ...d, ssh_pass: e.target.value }))}
              placeholder={initial?.ssh_pass_set ? '•••••••• (unchanged)' : ''}
              helperText={initial?.ssh_pass_set ? 'Leave blank to keep current' : undefined}
            />
            <Stack direction="row" alignItems="center" spacing={2}>
              <Button
                variant="outlined"
                size="small"
                disabled={sshTestStatus === 'testing'}
                onClick={async () => {
                  setSshTestStatus('testing');
                  setSshTestMessage('');
                  try {
                    await putAsteriskSettings({
                      ssh_host: data.ssh_host || undefined,
                      ssh_port: data.ssh_port,
                      ssh_user: data.ssh_user || undefined,
                      ssh_pass: data.ssh_pass || undefined,
                    });
                    const r = await postSshTest();
                    setSshTestStatus('connected');
                    setSshTestMessage(r.stdout ? `Hostname: ${r.stdout}` : 'Connection OK');
                    enqueueSnackbar('SSH connected', { variant: 'success' });
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : 'SSH test failed';
                    setSshTestStatus('failed');
                    setSshTestMessage(msg);
                    enqueueSnackbar(msg, { variant: 'error' });
                  }
                }}
              >
                {sshTestStatus === 'testing' ? 'Testing...' : 'Test SSH'}
              </Button>
              {sshTestStatus === 'connected' && (
                <Typography component="span" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  ✅ Connected {sshTestMessage && `(${sshTestMessage})`}
                </Typography>
              )}
              {sshTestStatus === 'failed' && (
                <Typography component="span" color="error.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  ❌ Failed: {sshTestMessage}
                </Typography>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Button variant="contained" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save and reconnect'}
      </Button>
    </Box>
  );
}
