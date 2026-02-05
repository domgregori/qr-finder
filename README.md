# Lost & Found Tracker

A self-hosted device tracking application with QR codes and instant notifications. Track your valuables with unique QR codes and get notified when someone finds them.

## Features

- **Admin Dashboard**: Secure login to manage all your devices
- **Device Management**: Add, edit, and delete tracked devices
- **QR Code Generator**: Customizable QR codes (colors, sizes, text overlays, module shapes)
- **Apprise Notifications**: Get instant alerts via 80+ services (Telegram, Discord, ntfy, etc.)
- **Public Message Board**: Finders can leave messages without creating accounts
- **Cloudflare Turnstile**: Optional spam protection for public forms
- **Photo Uploads**: Attach photos to help identify devices
- **Light/Dark Mode**: Full theme support across all pages
- **Self-Host Friendly**: Local file storage, included PostgreSQL, minimal dependencies

---

## Quick Start (Docker - Recommended)

The easiest way to run Lost & Found Tracker is with Docker Compose. This includes PostgreSQL and uses local file storage by default - no external services required!

### 1. Clone and Configure

```bash
git clone <your-repo-url>
cd lost_and_found_tracker/nextjs_space
cp .env.example .env
```

### 2. Edit .env File

At minimum, change these values:

```bash
# IMPORTANT: Change this password!
POSTGRES_PASSWORD=your-secure-password

# IMPORTANT: Generate a new secret!
# Run: openssl rand -base64 32
NEXTAUTH_SECRET=your-generated-secret

# Set your public URL (change for production)
NEXTAUTH_URL=http://localhost:3000

# Database connection (optional override)
DATABASE_URL=postgresql://lostfound:your-secure-password@db:5432/lostfound

# Optional: Admin seed credentials
ADMIN_EMAIL=admin@lostfound.local
ADMIN_PASSWORD=admin123
ADMIN_NAME=Admin
```

### 3. Start the Application

```bash
docker-compose up -d --build
```

### 4. Initialize Database

```bash
# Push database schema
docker-compose exec app npx prisma db push

# Create admin user
docker-compose exec app npx prisma db seed
```

### 5. Access the App

Open http://localhost:3000 and login with:
- **Email**: `admin@lostfound.local` (or `ADMIN_EMAIL`)
- **Password**: `admin123` (or `ADMIN_PASSWORD`)

⚠️ **Change this password in production!**

---

## Self-Hosting Guide

### Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│   PostgreSQL    │
│   (Port 3000)   │     │   (Port 5432)   │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Local Storage  │  (or S3-compatible)
│   ./uploads/    │
└─────────────────┘
```

### Storage Options

#### Option 1: Local Storage (Default)

Files are stored in the `./uploads` directory. This is the simplest option and works out of the box.

```bash
# In .env
STORAGE_TYPE=local
```

#### Option 2: AWS S3

```bash
# In .env
STORAGE_TYPE=s3
AWS_BUCKET_NAME=your-bucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

#### Option 3: S3-Compatible (MinIO, Backblaze B2, etc.)

```bash
# In .env
STORAGE_TYPE=s3
AWS_BUCKET_NAME=your-bucket
AWS_ENDPOINT=http://minio:9000
AWS_FORCE_PATH_STYLE=true
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

### Database Options

#### Option 1: Included PostgreSQL (Default)

The docker-compose.yml includes a PostgreSQL container. Data is persisted in a Docker volume.

#### Option 2: External PostgreSQL

Comment out the `db` service in docker-compose.yml and set your external database URL:

```bash
# In .env
DATABASE_URL=postgresql://user:password@your-host:5432/lostfound?sslmode=require
```

### Notification Services

Lost & Found uses [Apprise](https://github.com/caronc/apprise) URLs for notifications. Each device can have its own notification endpoint.

**Popular services:**

| Service | URL Format |
|---------|------------|
| ntfy.sh | `ntfy://your-topic` or `https://ntfy.sh/your-topic` |
| Telegram | `tgram://bottoken/ChatID` |
| Discord | `discord://webhook_id/webhook_token` |
| Gotify | `gotify://hostname/token` |
| Pushover | `pover://user@token` |
| Email | `mailto://user:pass@gmail.com` |
| Slack | `slack://TokenA/TokenB/TokenC` |

See the [Apprise Wiki](https://github.com/caronc/apprise/wiki) for 80+ more services.

### Spam Protection (Optional)

Cloudflare Turnstile provides captcha protection for the public message form.

1. Get keys from [Cloudflare Turnstile](https://dash.cloudflare.com/turnstile)
2. Add to .env:

```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key
TURNSTILE_SECRET_KEY=your-secret-key
```

If not configured, the form will work without captcha.

---

## Exposing to the Internet

### Option 1: Cloudflare Tunnel (Recommended)

Secure external access without opening ports or exposing your IP.

```bash
# Install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create lostfound
cloudflared tunnel route dns lostfound lost.yourdomain.com

# Create config (~/.cloudflared/config.yml)
echo 'tunnel: <your-tunnel-id>
credentials-file: /home/user/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: lost.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404' > ~/.cloudflared/config.yml

# Run (or set up as systemd service)
cloudflared tunnel run lostfound
```

### Option 2: Reverse Proxy (Nginx/Caddy)

**Caddy (automatic HTTPS):**

```
lost.yourdomain.com {
    reverse_proxy localhost:3000
}
```

**Nginx:**

```nginx
server {
    listen 443 ssl http2;
    server_name lost.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Separate Admin/Public Portals (Optional)

For enhanced security, you can deploy the admin dashboard and public portal on separate domains. This keeps your admin interface isolated from the public-facing QR code pages.

### Configuration

Set the `PUBLIC_PORTAL_URL` environment variable on your **admin instance** to point to your public portal:

```bash
# On admin instance (.env)
PUBLIC_PORTAL_URL=https://found.example.com
NEXTAUTH_URL=https://admin.example.com
```

When set, all QR codes generated from the admin dashboard will point to the public portal domain instead of the admin domain.

### Deployment Options

#### Option A: Two Separate Deployments (Recommended)

Deploy the same codebase twice with different configurations:

**Public Instance** (`found.example.com`):
- Serves: `/device/*` routes only
- Receives: QR code scans and finder messages
- Can restrict access using reverse proxy rules

**Admin Instance** (`admin.example.com`):
- Serves: `/dashboard/*`, `/login`, `/api/*` routes
- Set `PUBLIC_PORTAL_URL=https://found.example.com`
- QR codes will automatically use the public domain

Both instances connect to the **same database**.

**Nginx example for public instance:**
```nginx
server {
    server_name found.example.com;
    
    # Only allow public device pages
    location /device {
        proxy_pass http://localhost:3001;
    }
    
    location /api/public {
        proxy_pass http://localhost:3001;
    }
    
    # Block everything else
    location / {
        return 404;
    }
}
```

#### Option B: Single Deployment with Route Restrictions

Use your reverse proxy to restrict routes by hostname on a single deployment.

### Why Separate Portals?

- **Security**: Admin routes are never exposed on the public domain
- **Scalability**: Scale public portal independently for high traffic
- **Monitoring**: Separate logs and metrics for each concern
- **Branding**: Use different domains (e.g., `admin.company.com` vs `found.it`)

---

## Development Setup

For local development without Docker:

### Prerequisites

- Node.js 18+
- PostgreSQL (or use SQLite for quick testing)
- Yarn

### Steps

```bash
# Install dependencies
yarn install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Generate Prisma client
yarn prisma generate

# Push database schema
yarn prisma db push

# Seed admin user
yarn prisma db seed

# Start dev server
yarn dev
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `POSTGRES_PASSWORD` | Docker | `changeme` | PostgreSQL password (docker-compose) |
| `NEXTAUTH_URL` | Yes | - | Your app's public URL |
| `NEXTAUTH_SECRET` | Yes | - | Session encryption secret |
| `STORAGE_TYPE` | No | `local` | `local` or `s3` |
| `AWS_BUCKET_NAME` | S3 only | - | S3 bucket name |
| `AWS_REGION` | S3 only | `us-east-1` | AWS region |
| `AWS_ACCESS_KEY_ID` | S3 only | - | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | S3 only | - | AWS secret key |
| `AWS_ENDPOINT` | S3-compat | - | Custom S3 endpoint (MinIO, etc.) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | No | - | Cloudflare Turnstile site key |
| `TURNSTILE_SECRET_KEY` | No | - | Cloudflare Turnstile secret |

---

## Backup & Restore

### Database Backup

```bash
# Backup
docker-compose exec db pg_dump -U lostfound lostfound > backup.sql

# Restore
cat backup.sql | docker-compose exec -T db psql -U lostfound lostfound
```

### File Storage Backup

```bash
# If using local storage
tar -czf uploads-backup.tar.gz uploads/

# Restore
tar -xzf uploads-backup.tar.gz
```

---

## Updating

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build

# Run any database migrations
docker-compose exec app npx prisma db push
```

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js (credentials provider)
- **Styling**: Tailwind CSS + shadcn/ui
- **QR Generation**: qrcode library
- **File Storage**: Local filesystem or AWS S3
- **Captcha**: Cloudflare Turnstile (optional)
- **Notifications**: Apprise-compatible URLs

---

## License

This project is licensed under the [Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/).

You are free to share and adapt this work for non-commercial purposes with appropriate attribution.
