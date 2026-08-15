# Significant Changes

Это не дубликат git log. Фиксируются изменения архитектуры, публичных контрактов,
миграций, тестовой стратегии и инженерного процесса.

## 2026-08-15 — TASK-001 Security baseline

- Changed: OAuth account metadata теперь формируется только из allowlisted
  provider/profile полей; raw token/profile responses больше не сохраняются.
- Changed: HTTP access logger удаляет OAuth `code`, `state`, `access_token`,
  `refresh_token` и `token` из query без потери operational log fields.
- Migration: существующая `platform_accounts.metadata` полностью заменяется
  безопасным объектом из typed account columns.
- Tests: добавлены regression tests metadata sanitization, URL logging и migration
  contract; migration проверена на legacy PostgreSQL fixture и повторном запуске.
- Compatibility: public auth/account API и Prisma schema не изменены.
- Verification: 77 backend tests, 18 frontend tests, typecheck, build и docs gates
  прошли.

## 2026-08-15 — AI engineering context baseline

- Added: канонический `docs/ai` context layer и root `AGENTS.md`.
- Added: current sprint, compact backlog, just-in-time TASK/CR templates.
- Added: dependency-free documentation validator и Node tests.
- Added commands: `pnpm docs:check`, `pnpm docs:check:test`.
- Decision: первая продуктовая итерация — TASK-001 Security baseline.
- Runtime/API/database impact: none.

## 2026-08-14 — Product scope cleanup

- Related commit: `1390e70`.
- Removed: experimental VK wall/link-post integration, manual VK token flow,
  Threads active scope, email fallback и SaaS/native roadmap.
- Changed: active MVP platforms — Instagram, TikTok, YouTube; VK/Pinterest —
  этап 2.
- Migration: удалены Threads enum data/value и email notification preference.
- Verification: typecheck, backend/frontend tests and production build passed.
