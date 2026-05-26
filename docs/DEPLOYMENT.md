# VegaCore OS – VPS Deployment Guide

## Server Requirements

- Ubuntu 22.04+ or similar Linux
- 4GB RAM minimum (8GB recommended)
- 40GB SSD
- Docker 24+ and Docker Compose v2

## 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y
```

## 2. Deploy Application

```bash
git clone <your-repo> /opt/vegasystem
cd /opt/vegasystem

# Configure production environment
cp .env.example .env
nano .env  # Set strong JWT secrets, domain, etc.
```

Required production variables:

```env
JWT_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<64-char-random-string>
DATABASE_URL=postgresql://vos:STRONG_PASSWORD@postgres:5432/vegasystem
CORS_ORIGIN=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1
```

```bash
# Build and start all services
docker compose up -d --build

# Run database migrations
docker compose exec api npx prisma migrate deploy

# Seed initial data (first deploy only)
docker compose exec api npx prisma db seed
```

## 3. SSL with Let's Encrypt

```bash
sudo apt install certbot -y

# Stop nginx temporarily
docker compose stop nginx

sudo certbot certonly --standalone -d yourdomain.com

# Copy certs to docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/nginx/ssl/

docker compose up -d nginx
```

## 4. PM2 (Alternative – without Docker)

```bash
npm install -g pm2

# API
cd apps/api
npm run build
pm2 start dist/main.js --name vos-api

# Web
cd apps/web
npm run build
pm2 start npm --name vos-web -- start

pm2 save
pm2 startup
```

## 5. Backup Strategy

### Database (daily cron)

```bash
0 2 * * * docker compose exec -T postgres pg_dump -U vos vegasystem | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz
```

### MinIO files

```bash
0 3 * * * docker run --rm -v minio_data:/data -v /backups:/backup alpine tar czf /backup/minio-$(date +\%Y\%m\%d).tar.gz /data
```

### Retention

- Daily backups: 7 days
- Weekly backups: 4 weeks
- Monthly backups: 12 months

## 6. Monitoring

- Health check: `curl http://localhost:4000/api/v1/dashboard/executive` (with auth)
- Logs: `docker compose logs -f api web`
- PostgreSQL: `docker compose exec postgres pg_isready`

## 7. CI/CD Structure

```
.github/workflows/
├── ci.yml          # Lint, build, test on PR
└── deploy.yml      # Deploy to VPS on main merge
```

Recommended CI steps:
1. `npm ci`
2. `npx prisma validate`
3. `npm run build`
4. Docker build & push to registry
5. SSH deploy to VPS

## Disaster Recovery

1. Restore PostgreSQL from latest backup
2. Restore MinIO volume
3. Redeploy containers: `docker compose up -d --build`
4. Verify with seed admin login

Recovery Time Objective (RTO): < 1 hour  
Recovery Point Objective (RPO): < 24 hours (daily backups)
