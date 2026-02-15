import http from 'http';
import express from 'express';
import cors from 'cors';
import { attachWebSocketServer } from './realtime/ws';
import * as ariClient from './ari/ariClient';
import * as amiClient from './ami/amiClient';
import callsRoutes from './routes/calls';
import ariRoutes from './routes/ari';
import amiRoutes from './routes/ami';
import healthRoutes from './routes/health';
import statsRoutes from './routes/stats';
import settingsRoutes from './routes/settings';
import sshRoutes from './routes/ssh';
import cdrRoutes from './routes/cdr';
import pool from './db/pool';
import * as repoCdr from './db/repoCdr';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/calls', callsRoutes);
app.use('/api/cdr', cdrRoutes);
app.use('/api/ari', ariRoutes);
app.use('/api/ami', amiRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ssh', sshRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/stats', statsRoutes);

const server = http.createServer(app);
attachWebSocketServer(server);

const PORT = Number(process.env.PORT || 3000);

async function main() {
  await repoCdr.ensureCdrTable(pool);

  const ariCfg = await import('./config/asteriskConfig').then((m) => m.getAriConfig());
  const amiCfg = await import('./config/asteriskConfig').then((m) => m.getAmiConfig());
  if (ariCfg) {
    ariClient.startAriClient(ariCfg).catch((err) => {
      console.error('ARI start failed (continuing without ARI):', err.message);
    });
  } else {
    console.warn('ARI config not set (env or admin panel); ARI endpoints will fail.');
  }
  if (amiCfg) {
    amiClient.startAmiClient(amiCfg).catch((err) => {
      console.error('AMI start failed (continuing without AMI):', err.message);
    });
  } else {
    console.warn('AMI config not set (env or admin panel); AMI endpoints will fail.');
  }

  server.listen(PORT, () => {
    console.info(`Server listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
