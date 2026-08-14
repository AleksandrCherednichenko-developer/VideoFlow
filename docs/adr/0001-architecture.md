# ADR 0001: VideoFlow Architecture

## Status

Superseded by [ADR 0002](0002-pwa-first-saas-ready.md).

This ADR is retained as a historical record of the initial architecture.

## Context

VideoFlow needs to publish user-uploaded videos to multiple social platforms on a schedule. The app must be installable on iPhone and iPad without the App Store, keep publishing reliable even when the browser is closed, and support staged expansion from a private MVP to a SaaS product.

## Decision

Use a PWA frontend backed by a Node.js API and background worker architecture:

- React + Vite PWA for the installable client.
- Node.js 20 + Express for the REST API.
- PostgreSQL 16 + Prisma for durable relational data and JSONB platform settings.
- Redis 7 + BullMQ for scheduled publication jobs and retries.
- Cloudflare R2 for video storage and public video URLs required by Meta-based integrations.
- Docker Compose for local and VPS deployment.
- Nginx + Let's Encrypt for HTTPS, static frontend delivery, and API proxying.

## Consequences

- Publishing is performed by backend workers, so it does not depend on iOS background browser behavior.
- PWA installation avoids Apple Developer Program and App Store review.
- Platform integrations stay isolated behind worker modules, allowing one platform to fail without blocking others.
- PostgreSQL remains the source of truth for publication status, account tokens, and results.
- Cloudflare R2 must be configured before Instagram and Threads can work reliably.
