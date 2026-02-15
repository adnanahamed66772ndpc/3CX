# Automatic Deployment (GitHub Actions + Docker)

Push to `main` triggers automatic deployment via SSH. Works on **fresh Ubuntu 24** with nothing pre-installed.

## Server Requirements

- **Ubuntu 24.x** (stock OS, nothing else needed)
- SSH access (password or key)
- Internet connection

The workflow installs Docker, Docker Compose, and Git on first run.

## 1. Add GitHub Secrets

Go to **GitHub repo → Settings → Secrets and variables → Actions** and add:

| Secret | Required | Description |
|--------|----------|-------------|
| `DEPLOY_HOST` | ✅ | Server IP or hostname (e.g. `103.159.37.176`) |
| `DEPLOY_USER` | ✅ | SSH username (e.g. `root` or `ubuntu`) |
| `DEPLOY_SSH_KEY` | ✅ | SSH private key (paste entire contents of `id_rsa` or `id_ed25519`) |
| `DEPLOY_PORT` | | SSH port (default: `22`) |
| `DEPLOY_PATH` | | Path on server (default: `/opt/astriks`) |
| `DEPLOY_GIT_URL` | | For private repos: `git@github.com:user/repo.git` |

### SSH Key Setup

1. Generate a key (if needed):
   ```bash
   ssh-keygen -t ed25519 -C "deploy" -f deploy_key -N ""
   ```

2. Add **public** key (`deploy_key.pub`) to the VPS:
   ```bash
   ssh-copy-id -i deploy_key.pub user@your-server
   ```

3. Add **private** key (`deploy_key`) to `DEPLOY_SSH_KEY` secret (copy full content including `-----BEGIN ... KEY-----` and `-----END ... KEY-----`).

## 2. First Deploy

- **Automatic**: Push to `main` branch
- **Manual**: Repo → Actions → "Deploy to Server" → Run workflow

No manual setup on the VPS. The workflow will:

1. Install Docker + Docker Compose (if missing)
2. Install Git (if missing)
3. Clone the repo (or pull if already cloned)
4. Create `.env` from `.env.example` (if missing)
5. Run `docker compose up -d --build`

## 3. After Deploy

- **Frontend**: http://YOUR_SERVER_IP:5173
- **Backend**: http://YOUR_SERVER_IP:3000

Configure ARI/AMI/MySQL in **Settings** (in the app) or edit `.env` on the server:

```bash
ssh user@your-server "cd /opt/astriks && nano .env"
```

## 4. Private Repos

The server must be able to clone:

- **Option A**: Add the server's SSH public key as a Deploy Key (Repo → Settings → Deploy keys), then set secret `DEPLOY_GIT_URL` = `git@github.com:USER/REPO.git`
- **Option B**: On the server, run `git config --global credential.helper store` and do one manual clone with your token

## 5. Verify

```bash
ssh user@your-server "cd /opt/astriks && sudo docker compose ps"
```
