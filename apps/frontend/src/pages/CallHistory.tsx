import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Box, Typography, TextField, Stack } from '@mui/material';
import { getCdr } from '../api/client';

export default function CallHistory() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: rows, isLoading, error } = useQuery({
    queryKey: ['cdr', from, to],
    queryFn: () => getCdr({ from: from || undefined, to: to || undefined }),
  });

  const columns: GridColDef[] = [
    { field: 'calldate', headerName: 'Date', width: 160, valueFormatter: (value: unknown) => (value ? new Date(String(value)).toLocaleString() : '') },
    { field: 'src', headerName: 'From', width: 120 },
    { field: 'dst', headerName: 'To', width: 120 },
    { field: 'duration', headerName: 'Duration (s)', width: 100, type: 'number' },
    { field: 'billsec', headerName: 'Bill sec', width: 90, type: 'number' },
    { field: 'disposition', headerName: 'Disposition', width: 110 },
    { field: 'uniqueid', headerName: 'Unique ID', width: 200 },
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Call history (CDR)
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Records from Asterisk CDR (AMI Cdr events). Enable cdr_manager in Asterisk to receive these.
      </Typography>
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
      </Stack>
      {error && <Typography color="error">Error loading call history</Typography>}
      <Box sx={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={rows || []}
          columns={columns}
          getRowId={(r) => r.id}
          loading={isLoading}
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        />
      </Box>
    </Box>
  );
}
