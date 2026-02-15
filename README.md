# ASTRIKS – Asterisk ARI/AMI + Node.js + MySQL + React Dashboard

Production-oriented full-stack system for **Asterisk 22 LTS**: Node.js backend (TypeScript) with ARI and AMI integration, MySQL for call/event storage, and a React + Material UI dashboard. You can perform all call actions (originate, hangup, monitor) from the website; Asterisk can run on a **separate server**.

## Architecture

- **Backend**: Express REST API + WebSocket for live events. Connects to Asterisk via ARI (call control) and AMI (monitoring + actions). Writes calls and events to MySQL.
- **Frontend**: React + MUI + TanStack Query. Dashboard, Calls list/detail, Actions (ARI/AMI originate and hangup), Live events stream. All traffic goes through the backend (no direct ARI/AMI from the browser).
- **Asterisk**: External (not in Docker). Install and configure as in [docs/ASTERISK-INSTALL.md](docs/ASTERISK-INSTALL.md).

## Quick start (Docker – recommended)

Run everything (MySQL + backend + frontend) in one command:

```bash
docker compose up --build -d
```

Then open:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **MySQL**: localhost:3306 (user: `telephony`, pass: `telephony`)

All migrations (001, 002, 003) run automatically on first MySQL startup. For ARI/AMI/SSH, configure in **Settings** or set env vars in `.env` (optional).

**Stop**: `docker compose down` | **Logs**: `docker compose logs -f` | **Makefile**: `make run` or `make up`

---

## Alternative: local dev

1. **Clone and env**

   ```bash
   cp .env.example .env
   # Edit .env: set ARI_*, AMI_*, MYSQL_* (and ASTERISK_SERVER_IP if Asterisk is remote).
   ```

2. **MySQL with Docker, backend + frontend locally**

   ```bash
   # Terminal 1: MySQL (Docker or local)
   docker-compose up -d mysql

   # Terminal 2: backend
   cd apps/backend && npm install && npm run dev

   # Terminal 3: frontend
   cd apps/frontend && npm install && npm run dev
   ```

3. **Migrations**

   With Docker, all migrations (001, 002, 003) run automatically on first MySQL startup. For local MySQL:

   ```bash
   mysql -h 127.0.0.1 -u telephony -p telephony < migrations/001_initial.sql
   mysql -h 127.0.0.1 -u telephony -p telephony < migrations/002_asterisk_settings.sql
   mysql -h 127.0.0.1 -u telephony -p telephony < migrations/003_asterisk_settings_ssh.sql
   ```

4. **Open**

   - Frontend: http://localhost:5173  
   - Backend API: http://localhost:3000  
   - Live events WebSocket: ws://localhost:3000/api/live (proxied via Vite in dev).

## Environment variables

See [.env.example](.env.example). Main ones:

| Variable     | Description |
|-------------|-------------|
| `ARI_URL`   | Asterisk ARI base URL (e.g. `http://ASTERISK_IP:8088`) |
| `ARI_USER` / `ARI_PASS` | ARI user from Asterisk `ari.conf` |
| `ARI_APP`   | Stasis app name (e.g. `myapp`) |
| `AMI_HOST` / `AMI_PORT` | Asterisk AMI host and port (5038 or 5039 for TLS) |
| `AMI_USER` / `AMI_PASS` | AMI user from Asterisk `manager.conf` |
| `MYSQL_*`   | MySQL connection (host, port, user, password, database) |

## Asterisk installation and connection

- **Full install and configuration** (Ubuntu 22, ARI, AMI, PJSIP, firewall, TLS): [docs/ASTERISK-INSTALL.md](docs/ASTERISK-INSTALL.md).
- **Connecting Asterisk to your website**: same doc, section “Connecting Asterisk to your website”. Summary: set backend env to point at Asterisk’s IP; on Asterisk server, allow only the backend server’s IP to ARI and AMI ports.

Example config snippets are under [docs/asterisk/](docs/asterisk/) (http.conf, ari.conf, extensions.conf, manager.conf, pjsip.conf). For **SIP trunk and DID** setup, see [docs/SIP-TRUNK-AND-DID.md](docs/SIP-TRUNK-AND-DID.md). You can also configure **ARI and AMI** from the **Settings** page in the dashboard (stored in DB, overrides .env).

## Security checklist

- **TLS**: Use HTTPS/WSS for ARI and TLS for AMI in production. Asterisk provides `ast_tls_cert` for cert generation.
- **Firewall**: Allow ARI (8088/8089) and AMI (5038/5039) only from the backend server’s IP. Do not expose these ports to the public internet.
- **Least privilege**: AMI user should have only the permissions needed. Treat Originate as privileged; protect any UI that triggers it.
- **Secrets**: Do not commit `.env` or put ARI/AMI credentials in the frontend. The UI must only call the backend API and WebSocket.

## Scaling notes

- **ARI**: Only one WebSocket can subscribe per ARI application name. Run exactly **one** backend process that connects to ARI for the given `ARI_APP`. If you scale the HTTP API (e.g. multiple workers or replicas), keep ARI connectivity in a **singleton** worker; other workers can serve REST and WebSocket fan-out from a shared bus (e.g. Redis) if needed.
- **AMI**: Multiple AMI clients are allowed. Use **event filtering** (e.g. in `manager.conf`) to reduce event volume.
- **API/Frontend**: Scale stateless API and frontend horizontally; only the ARI subscriber must be a singleton.

## API summary

- `GET /api/calls?from=&to=&status=` – list calls  
- `GET /api/calls/:callId` – get call  
- `GET /api/calls/:callId/events` – get events for a call  
- `GET /api/stats` – dashboard stats (active calls, calls today, failures, calls per hour)  
- `GET /api/health` – health check  
- `POST /api/ari/calls` – ARI originate (body: endpointA, endpointB, callerId?, media?)  
- `POST /api/ari/calls/:callId/hangup` – ARI hangup by call ID  
- `POST /api/ami/calls` – AMI originate (body: channel, context, exten, callerId?, variables?)  
- `POST /api/ami/hangup` – AMI hangup (body: channel)  
- `GET /api/settings/asterisk` – ARI/AMI settings (for admin panel)  
- `PUT /api/settings/asterisk` – save ARI/AMI/SSH settings (reconnects clients)  
- `POST /api/ssh/test` – test SSH connection (uses Settings SSH credentials)  
- WebSocket `GET /api/live` – live normalized events (ARI + AMI).

## Database indexes

The schema in `migrations/001_initial.sql` includes these indexes on purpose:

- **calls**: `idx_started_at` — dashboard “calls today” and list ordered by time; `idx_status_started` — filter by status and time; `idx_uniqueid` / `idx_linkedid` — correlate AMI events (Hangup, etc.) to a call row; `uq_ami_action_id` — map OriginateResponse `ActionID` to `call_id`.
- **call_events**: `idx_call_time (call_id, event_time)` — call detail timeline; `idx_type_time (event_type, event_time)` — analytics by event type and time.

Using these avoids full table scans for list/detail and event correlation.

## Repo structure

- `apps/backend` – Node.js (TypeScript), Express, ARI/AMI clients, MySQL, WebSocket  
- `apps/frontend` – React (TypeScript), Vite, MUI, TanStack Query  
- `migrations/` – SQL schema (`002_asterisk_settings.sql` for admin ARI/AMI config)  
- `docs/asterisk/` – Asterisk config snippets (including manager event filtering)  
- `docs/ASTERISK-INSTALL.md` – Full Asterisk 22 install and “connect to your website” guide  

## PM2 (optional)

To run the backend with PM2 while keeping ARI as a singleton, use a single process (do **not** use cluster mode for the process that connects to ARI):

```bash
cd apps/backend && npm run build
pm2 start dist/server.js --name astriks-backend
```

If you later split into an API-only worker and an ARI worker, run only one ARI worker and scale the API workers separately.

## License

Use and adapt as needed for your project.
