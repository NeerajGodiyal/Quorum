# Deployment Guide

Overclock runs as two processes: a Next.js web server and a Socket.IO real-time server. Both share a SQLite database.

## Prerequisites

- Node.js 20+
- pnpm 9+

## Local Development

```bash
# Install dependencies
pnpm install

# Seed the database (creates tables + sample data)
pnpm db:seed

# Start both servers
pnpm dev
```

- Web: http://localhost:3000
- Socket.IO: http://localhost:3001

### Login Credentials

All accounts are admin. Password for all: `admin123!`

- `koro@overclock.one`
- `smcio@overclock.one`
- `7layer@overclock.one`
- `dubbleosix@overclock.one`
- `rupansh@overclock.one`

## Environment Variables

Create a `.env` file in the project root:

```env
# Required in production
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
BETTER_AUTH_URL=https://your-domain.com

# Optional (defaults shown)
SOCKET_PORT=3001
DATABASE_URL=file:./packages/db/data/sqlite.db
```

### Generating a Secret

```bash
openssl rand -base64 32
```

## Production Build

```bash
# Build the Next.js app
pnpm --filter web build

# The socket server runs via tsx in development
# For production, compile it:
pnpm --filter socket-server build
```

## Deployment Options

### Option 1: Single VPS (Recommended for Small Teams)

1. **Provision a VPS** (DigitalOcean, Hetzner, Linode — 2GB RAM minimum)

2. **Clone and build:**
   ```bash
   git clone <repo-url> /app/overclock
   cd /app/overclock
   pnpm install --frozen-lockfile
   pnpm --filter web build
   ```

3. **Set environment variables:**
   ```bash
   export BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
   export BETTER_AUTH_URL="https://your-domain.com"
   export NODE_ENV=production
   ```

4. **Use PM2 to manage processes:**
   ```bash
   npm install -g pm2

   # Start Next.js
   pm2 start "pnpm --filter web start" --name oc-web

   # Start Socket.IO
   pm2 start "pnpm --filter socket-server start" --name oc-socket

   pm2 save
   pm2 startup
   ```

5. **Nginx reverse proxy:**
   ```nginx
   server {
       listen 443 ssl;
       server_name your-domain.com;

       ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

       # Next.js
       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_cache_bypass $http_upgrade;
       }

       # Socket.IO
       location /socket.io/ {
           proxy_pass http://127.0.0.1:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

6. **SSL with Let's Encrypt:**
   ```bash
   certbot --nginx -d your-domain.com
   ```

### Option 2: Docker

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/ ./apps/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter web build

EXPOSE 3000 3001
CMD ["sh", "-c", "pnpm --filter socket-server start & pnpm --filter web start"]
```

```bash
docker build -t overclock .
docker run -p 3000:3000 -p 3001:3001 \
  -e BETTER_AUTH_SECRET="your-secret" \
  -e BETTER_AUTH_URL="http://localhost:3000" \
  -v oc-data:/app/packages/db/data \
  overclock
```

### Option 3: Cloudflare Tunnel (Zero Config)

For accessing from outside your local network without exposing ports:

```bash
# Install cloudflared
brew install cloudflared

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create overclock

# Run tunnel (maps your-domain.com → localhost:3000)
cloudflared tunnel route dns overclock your-subdomain.your-domain.com
cloudflared tunnel run --url http://localhost:3000 overclock
```

## Database Backup

The SQLite database is a single file. Back it up with:

```bash
# Safe backup (works even while app is running due to WAL mode)
sqlite3 packages/db/data/sqlite.db ".backup packages/db/data/backup.db"

# Or simply copy (stop the app first for consistency)
cp packages/db/data/sqlite.db packages/db/data/backup-$(date +%Y%m%d).db
```

## Reseeding

To reset the database with fresh sample data:

```bash
rm packages/db/data/sqlite.db
pnpm db:seed
```

## Socket.IO Client Configuration

If deploying behind a reverse proxy, update the socket URL in `apps/web/src/hooks/use-socket.ts` to point to your production URL:

```typescript
// For same-domain deployment behind nginx:
const socket = io(window.location.origin, { path: "/socket.io/" });

// For separate domain:
const socket = io("https://socket.your-domain.com");
```

## Updating Auth URL

When deploying to a custom domain, update the auth client in `apps/web/src/lib/auth-client.ts`:

```typescript
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [adminClient()],
});
```

And add `NEXT_PUBLIC_APP_URL` to your environment variables.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "BETTER_AUTH_SECRET must be set" | Set the env var before starting |
| Socket.IO not connecting | Check CORS origins, ensure port 3001 is accessible |
| Database locked errors | Ensure WAL mode: `sqlite3 db.sqlite "PRAGMA journal_mode=WAL"` |
| Auth session not persisting | Check `trustedOrigins` in auth config matches your domain |
| Build fails on imports | Run `pnpm install` from the repo root |
