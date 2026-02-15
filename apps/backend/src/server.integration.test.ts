/**
 * Integration-style test: mock ARI/AMI and hit REST API.
 * Does not require a real Asterisk or MySQL.
 */
import request from 'supertest';

jest.mock('./ari/ariClient', () => ({
  startAriClient: jest.fn().mockResolvedValue(undefined),
  originateBridgePlayHangup: jest.fn().mockResolvedValue('mock-ari-call-id'),
  hangupCall: jest.fn().mockResolvedValue(true),
}));

jest.mock('./ami/amiClient', () => ({
  startAmiClient: jest.fn().mockResolvedValue(undefined),
  amiOriginate: jest.fn().mockResolvedValue('mock-ami-call-id'),
  amiHangup: jest.fn().mockResolvedValue('hangup-action-123'),
}));

jest.mock('./db/pool', () => ({
  __esModule: true,
  default: {
    execute: jest.fn().mockResolvedValue([[]]),
  },
  healthCheck: jest.fn().mockResolvedValue(true),
}));

// Import after mocks
import express from 'express';
import cors from 'cors';
import callsRoutes from './routes/calls';
import ariRoutes from './routes/ari';
import amiRoutes from './routes/ami';
import healthRoutes from './routes/health';
import statsRoutes from './routes/stats';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/calls', callsRoutes);
app.use('/api/ari', ariRoutes);
app.use('/api/ami', amiRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/stats', statsRoutes);

describe('API integration', () => {
  it('POST /api/ari/calls returns 201 and callId', async () => {
    const res = await request(app)
      .post('/api/ari/calls')
      .send({ endpointA: 'PJSIP/1001', endpointB: 'PJSIP/1002' })
      .expect(201);
    expect(res.body).toHaveProperty('callId', 'mock-ari-call-id');
  });

  it('POST /api/ari/calls returns 400 when endpointA missing', async () => {
    await request(app)
      .post('/api/ari/calls')
      .send({ endpointB: 'PJSIP/1002' })
      .expect(400);
  });

  it('POST /api/ami/calls returns 201 and callId', async () => {
    const res = await request(app)
      .post('/api/ami/calls')
      .send({ channel: 'PJSIP/1001', context: 'internal', exten: '1002' })
      .expect(201);
    expect(res.body).toHaveProperty('callId', 'mock-ami-call-id');
  });

  it('POST /api/ami/calls returns 400 when channel missing', async () => {
    await request(app)
      .post('/api/ami/calls')
      .send({ context: 'internal', exten: '1002' })
      .expect(400);
  });

  it('GET /api/health returns 200', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toHaveProperty('ok');
  });
});
