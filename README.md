# VideoFlow

VideoFlow is a Progressive Web App for scheduling one video publication across multiple social platforms. The project starts with an MVP for YouTube and VK, then expands to Instagram, Threads, TikTok, Pinterest, push notifications, templates, teams, and billing.

## Stack

- Frontend: React, Vite, PWA, Tailwind CSS, shadcn/ui
- Backend: Node.js 20, Express, TypeScript
- Data: PostgreSQL 16, Prisma
- Queue: Redis 7, BullMQ
- File storage: Cloudflare R2
- Deployment: Docker Compose, Nginx, Let's Encrypt
- Notifications: PWA Push, in-app status, email fallback

## Repository Layout

```text
frontend/       React + Vite PWA
backend/        Express API, workers, platform integrations
infrastructure/ Docker Compose, Nginx, deployment assets
docs/           Product and technical documentation
.local/         Ignored local plans and private working notes
```

## Local Start

Stage 0 provides infrastructure only. Application services are implemented in later WBS stages.

```bash
cp .env.example .env
pnpm install
docker compose -f infrastructure/docker-compose.yml up -d postgres redis
docker compose -f infrastructure/docker-compose.yml ps
```

PostgreSQL is exposed on `localhost:5433` by default to avoid conflicts with a system PostgreSQL running on `5432`.

When backend and frontend packages are added:

```bash
pnpm dev
```

## Documentation

- Technical documentation: [docs/VideoFlow_Technical_Documentation.md](docs/VideoFlow_Technical_Documentation.md)
- Architecture decision: [docs/adr/0001-architecture.md](docs/adr/0001-architecture.md)
- Roadmap: [docs/roadmap.md](docs/roadmap.md)
