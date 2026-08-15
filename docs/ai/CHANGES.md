# Significant Changes

Это не дубликат git log. Фиксируются изменения архитектуры, публичных контрактов,
миграций, тестовой стратегии и инженерного процесса.

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
