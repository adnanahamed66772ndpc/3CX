# Automatic Deployment (GitHub Actions + Docker)

Push to `main` triggers automatic deployment to your server via SSH.

## 1. Server Requirements

- Linux server with Docker and Docker Compose
- SSH access (password or key)
- Git (for clone/pull)

```bash
# On Ubuntu/Debian
sudo apt update
sudo apt install -y docker.io docker-compose git
sudo usermod -aG docker $USER
# Log out and back in
```

## 2. Add GitHub Secrets

Go to **GitHub repo → Settings → Secrets and variables → Actions** and add:

| Secret | Required | Description |
|--------|----------|-------------|
| `DEPLOY_HOST` | ✅ | Server IP or hostname (e.g. `103.159.37.176`) |
| `DEPLOY_USER` | ✅ | SSH username (e.g. `root` or `ubuntu`) |
| `DEPLOY_SSH_KEY` | ✅ | SSH private key (paste entire contents of `id_rsa` or `id_ed25519`) |
| `DEPLOY_PORT` | | SSH port (default: `22`) |
| `DEPLOY_PATH` | | Path on server (default: `/opt/astriks`) |
| `DEPLOY_GIT_URL` | | Clone URL for private repos (e.g. `git@github.com:user/repo.git`) |

### SSH Key Setup

1. Generate a key (if needed):
   ```bash
   ssh-keygen -t ed25519 -C "deploy" -f deploy_key -N ""
   ```

2. Add **public** key (`deploy_key.pub`) to the server:
   ```bash
   ssh-copy-id -i deploy_key.pub user@your-server
   ```

3. Add **private** key (`deploy_key`) to `DEPLOY_SSH_KEY` secret (copy full content including `-----BEGIN ... KEY-----` and `-----END ... KEY-----`).

## 3. First-Time Server Setup

SSH into your server and create the deploy directory:

```bash
sudo mkdir -p /opt/astriks
sudo chown $USER:$USER /opt/astriks
```

Create `.env` in that folder (for ARI/AMI/MySQL):

```bash
cd /opt/astriks
cp .env.example .env
nano .env   # Edit ARI_*, AMI_*, MYSQL_* as needed
```

For **private** repos, the server must be able to clone:
- **Option A**: Add the server's SSH public key as a Deploy Key (Repo → Settings → Deploy keys), then set secret `DEPLOY_GIT_URL` = `git@github.com:USER/REPO.git`
- **Option B**: On the server, run `git config --global credential.helper store` and do one manual clone with your token

## 4. Deploy

- **Automatic**: Push to `main` branch
- **Manual**: Repo → Actions → "Deploy to Server" → Run workflow

## 5. Verify

```bash
ssh user@your-server "cd /opt/astriks && docker compose ps"
```

- Frontend: http://YOUR_SERVER_IP:5173  
- Backend: http://YOUR_SERVER_IP:3000  
