import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DataGrid, GridColDef, GridRowParams } from '@mui/x-data-grid';
import { Box, Typography, TextField, Stack, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getCalls } from '../api/client';

export default function Calls() {
  const navigate = useNavigate();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');

  const { data: calls, isLoading, error, refetch } = useQuery({
    queryKey: ['calls', from, to, status],
    queryFn: () => getCalls({ from: from || undefined, to: to || undefined, status: status || undefined }),
    refetchOnWindowFocus: true,
  });

  const columns: GridColDef[] = [
    { field: 'call_id', headerName: 'Call ID', width: 280 },
    { field: 'status', headerName: 'Status', width: 140 },
    { field: 'a_endpoint', headerName: 'A', width: 140 },
    { field: 'b_endpoint', headerName: 'B', width: 140 },
    {
      field: 'started_at',
      headerName: 'Started',
      width: 160,
      valueFormatter: (value: unknown) => (value ? new Date(String(value)).toLocaleString() : ''),
    },
    {
      field: 'ended_at',
      headerName: 'Ended',
      width: 160,
      valueFormatter: (value: unknown) => (value ? new Date(String(value)).toLocaleString() : ''),
    },
  ];

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" sx={{ mb: 2 }}>
        <Typography variant="h5">Calls</Typography>
        <Button startIcon={<RefreshIcon />} onClick={() => refetch()} disabled={isLoading} size="small">
          Refresh
        </Button>
      </Stack>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <TextField
          size="small"
          label="From (date)"
          type="datetime-local"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          label="To (date)"
          type="datetime-local"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder="e.g. ended"
        />
      </Stack>
      {error && (
        <Typography color="error" sx={{ mb: 1 }}>
          Error loading calls: {error instanceof Error ? error.message : String(error)}
        </Typography>
      )}
      <Box sx={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={calls || []}
          columns={columns}
          getRowId={(r) => r.call_id}
          loading={isLoading}
          onRowClick={(params: GridRowParams) => navigate(`/calls/${params.id}`)}
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        />
      </Box>
    </Box>
  );
}
