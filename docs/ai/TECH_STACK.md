# Technical Stack

**Verified:** 2026-08-15

`Declared` берётся из package manifests, `Resolved` — из текущего lockfile.
Обновление resolved-версий не является частью обычной продуктовой задачи.

## Runtime and tooling

| Component | Declared | Resolved / runtime |
|---|---|---|
| Node.js | `>=20` | production image `node:20-alpine` |
| pnpm | `9.15.4` | `9.15.4` |
| TypeScript | `^5.7.2` | `5.9.3` |
| Package layout | pnpm workspace | `frontend`, `backend` |

## Frontend

| Component | Declared | Resolved |
|---|---|---|
| React / React DOM | `^18.3.1` | `18.3.1` |
| Vite | `^6.0.7` | `6.4.3` |
| React Router | `^6.30.1` | `6.30.4` |
| TanStack Query | `^5.81.5` | `5.101.2` |
| Zustand | `^5.0.6` | `5.0.14` |
| Axios | `^1.10.0` | `1.18.1` |
| Tailwind CSS | `^3.4.17` | `3.4.19` |
| Vitest | `^2.1.8` | `2.1.9` |

UI foundation: Radix Slot, class-variance-authority, clsx, tailwind-merge и
Lucide React. PWA shell реализован собственным Service Worker без PWA plugin.

## Backend

| Component | Declared | Resolved |
|---|---|---|
| Express | `^4.21.2` | `4.22.2` |
| Prisma Client/CLI | `^6.1.0` | `6.19.3` |
| BullMQ | `^5.34.2` | `5.79.1` |
| ioredis | `^5.4.2` | `5.11.1` |
| Zod | `^3.24.1` | `3.25.76` |
| AWS SDK S3 client | `^3.1075.0` | `3.1075.0` |
| Vitest | `^2.1.8` | `2.1.9` |
| Supertest | `^7.0.0` | `7.2.2` |

Security libraries: bcrypt 5, jsonwebtoken 9, helmet 8, express-rate-limit 8.

## Data and infrastructure

- PostgreSQL 16 Alpine;
- Redis 7 Alpine with AOF;
- Cloudflare R2 through the S3-compatible API;
- Docker Compose for PostgreSQL, Redis, API and worker;
- HTTPS supported by the API and expected behind a production reverse proxy.

## Compiler rules

Оба приложения используют strict TypeScript, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes` и `noImplicitOverride`. Backend использует NodeNext,
frontend — ESNext/Bundler и alias `@/*`.

## Dependency rules

- Использовать только pnpm; lockfile обязателен.
- Не добавлять dependency без явного разрешения TASK.
- Не менять major/minor версии вместе с продуктовой фичей.
- Не применять API версии, которой нет в manifest/lockfile.
- Новые библиотеки для UI, state, validation, date/time или queue требуют
  отдельного обоснования и сравнения с существующим решением.
- Официальные SDK платформ добавляются только после successful feasibility gate.

## Verification commands

```bash
pnpm docs:check
pnpm docs:check:test
pnpm typecheck
pnpm test
pnpm build
```
