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

## Upload API (Cloudflare R2)

Authenticated endpoints for direct browser-to-R2 video upload:

- `POST /uploads/presign` — returns `videoR2Key`, `uploadUrl`, `expiresAt`, and required upload headers
- `POST /uploads/complete` — verifies the uploaded object exists in R2

Configure R2 credentials in `.env`:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY`
- `R2_SECRET_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_URL` (optional, required later for Instagram/Threads)

Manual verification flow:

```bash
# 1. Register or login and save accessToken
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 2. Request presigned upload URL
curl -X POST http://localhost:3000/uploads/presign \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"filename":"clip.mp4","contentType":"video/mp4","sizeBytes":123456}'

# 3. Upload the file directly to R2
curl -X PUT "<uploadUrl>" \
  -H "Content-Type: video/mp4" \
  --data-binary @clip.mp4

# 4. Confirm upload in backend
curl -X POST http://localhost:3000/uploads/complete \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"videoR2Key":"<videoR2Key>"}'
```

## Documentation

- Technical documentation: [docs/VideoFlow_Technical_Documentation.md](docs/VideoFlow_Technical_Documentation.md)
- Architecture decision: [docs/adr/0001-architecture.md](docs/adr/0001-architecture.md)
- Roadmap: [docs/roadmap.md](docs/roadmap.md)
