# VegaCore Operating System (VOS)

Enterprise-grade ERP/CRM/Project Management platform for VegaCore digital business development company.

## Stack

| Layer | Technology |
|-------|------------|
| Backend | NestJS, Prisma, PostgreSQL |
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Auth | JWT + Refresh Tokens, RBAC |
| Storage | MinIO (S3-compatible) |
| Cache | Redis |
| Realtime | Socket.io ready |
| Deploy | Docker, Docker Compose, NGINX |

## Modules

- **CRM** – Clients, packages, timeline, contracts
- **Projects** – Kanban, sprints, milestones, tasks
- **Marketing** – Content calendar, campaigns, scripts
- **Media** – Shoots, videos, production workflow
- **Models** – Portfolio, bookings, availability
- **HR** – Employees, attendance, leave, performance
- **Finance** – Invoices, payments, expenses, dashboard
- **Archive** – Assets, versioning, smart search
- **AI** – Script generator, content planner, analyzers
- **Security** – Pentest reports, vulnerability tracking
- **Dashboard** – Executive KPIs and analytics

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### 1. Start infrastructure

```bash
docker compose up -d postgres redis minio
```

### 2. Configure environment

```bash
cp .env.example .env
cp .env.example apps/api/.env
```

### 3. Install dependencies

```bash
npm install
```

### 4. Database setup

```bash
cd apps/api
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Run development

```bash
# From root
npm run dev
```

- API: http://localhost:4000
- Swagger: http://localhost:4000/api/docs
- Web: http://localhost:3000

### Default accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@vegasystem.local | Admin@123 |
| General Manager | manager@vegasystem.local | Manager@123 |
| Developer | dev@vegasystem.local | Dev@123 |

## Production Deployment

```bash
docker compose up -d
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for VPS deployment guide.

## Project Structure

```
vegasystem/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js frontend
├── docker/           # NGINX config
├── docs/             # ERD, deployment docs
└── docker-compose.yml
```

## API

REST API v1 with OpenAPI documentation at `/api/docs`.

Features: pagination, filtering, rate limiting, RBAC permissions, audit logs.

## License

Proprietary – VegaCore © 2026
