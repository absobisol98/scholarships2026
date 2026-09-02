# Deploying to a single EC2 instance (NGINX + PM2)

This mirrors the same pattern used for a previous app: one EC2 box running NGINX as a
reverse proxy in front of PM2-managed Next.js processes. No Docker, no ECS.

For a longer, plain-language walkthrough of *why* each piece is here, see the companion
guide delivered alongside this file. This document is the terse, copy-pasteable version.

## 1. Instance sizing

A single Next.js process on this app measurably degrades to an ~18s p99 response time
under a 500-concurrent burst (the kind an application-gate-opening moment produces) — even
on a 4 vCPU / 15GB box. One process is the bottleneck, not the box. So:

- **Day-to-day**: minimum **t3.medium** (2 vCPU / 4GB RAM), running PM2 in cluster mode
  with 2 workers.
- **Gate-opening windows** (a specific day/time you expect a traffic spike, e.g. an
  application deadline): temporarily run 2+ t3.medium instances behind an Application Load
  Balancer (an EC2 Auto Scaling Group), then scale back down afterward. This is optional —
  skip it if you don't have a predictable spike to plan around.

## 2. One-time server setup

```bash
# Node 20 (or later LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs nginx

# PM2, globally
sudo npm install -g pm2

# Clone the app
git clone <your-repo-url> scholarship-portal
cd scholarship-portal
npm ci
```

Create a `.env` file in the project root (never commit this) with the values from
`.env.example`:

```
DATABASE_URL=<Supabase pooled connection string, port 6543, pgbouncer=true>
DIRECT_URL=<Supabase direct connection string — only needed if you run migrations on this box>
SESSION_SECRET=<a long random string>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=...
```

## 3. First deploy

```bash
npx prisma generate     # required before build — no postinstall hook runs this automatically
npm run build
set -a; source .env; set +a
pm2 start ecosystem.config.js --env production
pm2 save                # remembers this process list
pm2 startup             # prints a command to run once, so PM2 restarts on server reboot
```

`ecosystem.config.js` (committed to this repo) runs the app in PM2 **cluster mode** —
`instances: "max"` starts one Next.js worker per CPU core, all sharing port 3000, load
balanced by PM2 itself. This is what turns a t3.medium's 2 vCPUs into 2 workers instead of
1, roughly doubling how much concurrent traffic the box can absorb before it degrades.

## 4. Redeploying a new version

```bash
git pull
npm ci
npx prisma generate
npm run build
pm2 reload ecosystem.config.js --env production
```

Use `pm2 reload`, not `pm2 restart` — reload restarts workers one at a time, so the site
stays up throughout the deploy instead of dropping every connection at once.

## 5. NGINX

Install with `sudo apt-get install -y nginx` (not testable in this project's sandbox — no
package-repo access there — so verify with `sudo nginx -t` on the real box before reloading).
Create `/etc/nginx/sites-available/scholarship-portal`:

```nginx
server {
    listen 80;
    server_name your-domain.example;

    # Matches this app's own upload cap (next.config.ts) — without this, NGINX rejects a
    # large certificate/video upload before it ever reaches Next.js.
    client_max_body_size 15m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then:

```bash
sudo ln -s /etc/nginx/sites-available/scholarship-portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Security headers (HSTS, X-Frame-Options, etc.) are already set by the app itself in
`next.config.ts` — no need to duplicate them in NGINX.

For HTTPS, run `sudo apt-get install -y certbot python3-certbot-nginx` and
`sudo certbot --nginx -d your-domain.example` — Certbot edits the NGINX config for you and
sets up auto-renewal.

## 6. Verified in this project's own sandbox before writing this doc

- `npm run build` — real production build, succeeds.
- `pm2 start ecosystem.config.js --env production` — 4 cluster workers came up (one per
  sandbox CPU), all serving real HTTP traffic on port 3000 within 3 seconds, zero restarts.
- `pm2 reload ecosystem.config.js --env production` — rolling restart, app kept responding
  (HTTP 200) throughout.
- NGINX itself could **not** be installed or syntax-checked in this sandbox (its package
  repository returned 404s here) — run `sudo nginx -t` on the real EC2 box after step 5
  before reloading, to catch any typo before it takes the site down.
