# ASTRIKS – Asterisk ARI/AMI + Node.js + MySQL + React Dashboard

Production-oriented full-stack telephony system for **Asterisk 22 LTS**: Node.js backend (TypeScript) with ARI and AMI integration, MySQL for call/event storage, and a React + Material UI dashboard. Perform call actions (originate, hangup, monitor) from the web; Asterisk runs on a **separate server**.

## Architecture

- **Backend**: Express REST API + WebSocket for live events. Connects to Asterisk via ARI (call control) and AMI (monitoring + actions). Writes calls and events to MySQL. SSH client for remote Asterisk config management.
- **Frontend**: React + MUI + TanStack Query. Dashboard, Calls list/detail, Actions (ARI/AMI originate/hangup), Live events, **Settings** (ARI, AMI, SSH config).
- **Asterisk**: External (not in Docker). Configure using examples in `docs/asterisk/`.

## Quick start (Docker)

```bash
docker compose up --build -d
```

| Service  | URL                    |
|----------|------------------------|
| Frontend | http://localhost:5173  |
| Backend  | http://localhost:3000  |
| MySQL    | localhost:3306 (user: `telephony`, pass: `telephony`) |

Migrations 001, 002, 003 run automatically on first MySQL start. Configure ARI/AMI/SSH in **Settings** or via `.env`.

**Commands**: `make up` \| `make down` \| `make logs` \| `make run`

## Automatic deployment (GitHub Actions)

Push to `main` auto-deploys via SSH. Works on **fresh Ubuntu 24** VPS (nothing pre-installed). Add these **GitHub Secrets** (Settings → Secrets → Actions):

| Secret | Description |
|--------|-------------|
| `DEPLOY_HOST` | Server IP or hostname |
| `DEPLOY_USER` | SSH username |
| `DEPLOY_SSH_KEY` | SSH private key (full content) |
| `DEPLOY_PORT` | SSH port (default: 22) |
| `DEPLOY_PATH` | Path on server (default: /opt/astriks) |

See [docs/DEPLOY.md](docs/DEPLOY.md) for setup.

## Admin panel

| Page       | Route       | Description                                      |
|------------|-------------|--------------------------------------------------|
| Dashboard  | `/dashboard`| Stats: active calls, today’s calls, failures     |
| Calls      | `/calls`    | Call list with filters                           |
| Call detail| `/calls/:id`| Single call timeline and events                  |
| Actions    | `/actions`  | ARI/AMI originate, hangup                        |
| Live events| `/live`     | Real-time event stream                           |
| Settings   | `/settings` | ARI, AMI, SSH (host, user, password) + SSH test  |

## Local development

```bash
# 1. MySQL
docker compose up -d mysql

# 2. Backend
cd apps/backend && npm install && npm run dev

# 3. Frontend
cd apps/frontend && npm install && npm run dev
```

Copy `.env.example` to `.env` and set `ARI_*`, `AMI_*`, `MYSQL_*`. For local MySQL, run migrations manually (Docker auto-runs them).

## Environment variables

| Variable         | Description                               |
|------------------|-------------------------------------------|
| `ARI_URL`        | Asterisk ARI URL (e.g. `http://IP:8088`)  |
| `ARI_USER` / `ARI_PASS` | ARI credentials (`ari.conf`)      |
| `ARI_APP`        | Stasis app name (default: `myapp`)        |
| `AMI_HOST` / `AMI_PORT` | Asterisk AMI host and port (5038)   |
| `AMI_USER` / `AMI_PASS` | AMI credentials (`manager.conf`)  |
| `SSH_HOST` / `SSH_PORT` / `SSH_USER` / `SSH_PASS` | SSH for remote Asterisk config (optional) |
| `MYSQL_*`        | MySQL connection                          |
| `VITE_API_URL`   | Backend URL for frontend (default: `http://localhost:3000`) |

## API endpoints

| Method | Path                    | Description                    |
|--------|-------------------------|--------------------------------|
| GET    | `/api/calls`            | List calls (query: from, to, status) |
| GET    | `/api/calls/:id`        | Get call                       |
| GET    | `/api/calls/:id/events` | Call events                    |
| GET    | `/api/stats`            | Dashboard stats                |
| GET    | `/api/health`           | Health check                   |
| POST   | `/api/ari/calls`        | ARI originate                  |
| POST   | `/api/ari/calls/:id/hangup` | ARI hangup                |
| POST   | `/api/ami/calls`        | AMI originate                  |
| POST   | `/api/ami/hangup`       | AMI hangup                     |
| GET    | `/api/settings/asterisk`| ARI/AMI/SSH settings           |
| PUT    | `/api/settings/asterisk`| Save settings (reconnects ARI/AMI) |
| POST   | `/api/ssh/test`         | Test SSH connection            |
| WS     | `/api/live`             | Live event stream              |

## Project structure

```
├── apps/
│   ├── backend/     # Node.js, Express, ARI/AMI/SSH, MySQL
│   └── frontend/    # React, Vite, MUI, TanStack Query
├── migrations/      # 001 initial, 002 asterisk_settings, 003 SSH
├── docs/
│   ├── asterisk/    # Config samples (ari, manager, pjsip, extensions, http)
│   ├── DEPLOY.md    # Auto-deploy setup (GitHub Actions + SSH)
│   └── SIP-TRUNK-AND-DID.md
├── no_need/         # Reference materials (not required for run)
├── docker-compose.yml
├── Makefile
└── .env.example
```

## Asterisk config

Example configs in `docs/asterisk/`:

- `ari.conf`, `manager.conf` – ARI/AMI
- `http.conf` – HTTP server
- `pjsip.conf`, `pjsip-trunk.conf.sample` – PJSIP
- `extensions.conf` – Dialplan
- `manager-eventfilter.conf` – AMI event filtering

SIP trunk and DID: [docs/SIP-TRUNK-AND-DID.md](docs/SIP-TRUNK-AND-DID.md)

## Security

- Use HTTPS/WSS and TLS for AMI in production.
- Restrict ARI (8088) and AMI (5038) to backend IP only.
- Do not expose `.env` or credentials in the frontend.

## PM2 (production)

```bash
cd apps/backend && npm run build
pm2 start dist/server.js --name astriks-backend
```

Run only one process that connects to ARI (no cluster mode for that process).
