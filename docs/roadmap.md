# VideoFlow Roadmap

## Phase 1: MVP, months 0-2

- Establish monorepo, Docker Compose, CI-ready structure, and documentation.
- Build auth, PostgreSQL schema, Prisma access, and base REST API.
- Add Cloudflare R2 presigned upload flow.
- Implement publications API, BullMQ scheduler, retry policy, and status aggregation.
- Build PWA shell, create-publication flow, dashboard, history, schedule, and detail screens.
- Integrate YouTube and VK workers.
- Add email fallback notifications.
- Deploy to a VPS over HTTPS and validate PWA installation on iPhone/iPad.

## Phase 2: v2, months 2-4

- Add Instagram and Threads via Meta OAuth and R2 URL publishing.
- Add TikTok OAuth and chunk upload worker.
- Add PWA push notifications with email fallback.
- Expand per-platform text overrides in the UI.

## Phase 3: v3, months 4-6

- Add Pinterest OAuth, board selection, media polling, and Video Pin publishing.
- Add publication templates.
- Improve history filters, loading states, empty states, and iPad/mobile UX polish.

## Phase 4: SaaS foundation, months 6+

- Add organizations, memberships, roles, and invites.
- Add billing and usage limits.
- Add public landing page, user-facing docs, privacy policy, and terms of service.
- Complete production readiness, monitoring, backups, and security review.
