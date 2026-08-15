# Iteration Backlog

Каждая итерация даёт проверяемый вертикальный результат за 2–5 рабочих дней.
Полный TASK создаётся just-in-time при переводе записи в `Ready`.

| ID | Result | Priority | Status | Depends on | Exit gate |
|---|---|---|---|---|---|
| TASK-001 | OAuth metadata и request logs не содержат secrets | Critical | Ready | Current baseline | Security tests + safe migration |
| TASK-002 | Документированное YouTube live-publish feasibility решение | Critical | Draft | TASK-001, Google test app/account | Gate report: supported/limited/blocked |
| TASK-003 | Worker выполняет resumable YouTube upload и сохраняет final URL/status | Critical | Draft | TASK-002 supported | Live E2E + failure tests |
| TASK-004 | Документированное Instagram Reels feasibility решение | Critical | Draft | TASK-001, Meta test app/account | Gate report |
| TASK-005 | Instagram account подключается официальным OAuth flow | High | Draft | TASK-004 supported | OAuth E2E + encrypted token lifecycle |
| TASK-006 | Worker публикует Instagram Reel и polling final status | Critical | Draft | TASK-005 | Live E2E + normalized errors |
| TASK-007 | Документированное TikTok Direct Post feasibility решение | Critical | Draft | TASK-001, TikTok test app/account | Gate report |
| TASK-008 | TikTok OAuth и Query Creator Info доступны в publish UX | High | Draft | TASK-007 supported | OAuth/consent E2E |
| TASK-009 | Worker выполняет TikTok Direct Post и status polling | Critical | Draft | TASK-008 | Live E2E + audit limitations |
| TASK-010 | Media хранит duration/dimensions и строго проверяет 9:16/60 sec | High | Draft | Stable upload baseline | Client/server validation tests |
| TASK-011 | Draft можно создать, открыть, изменить и удалить без schedule | Critical | Draft | TASK-010 | API/UI draft E2E |
| TASK-012 | Moscow time, edit, reschedule и cancel согласованы с queue | Critical | Draft | TASK-011 | Stale-job/concurrency tests |
| TASK-013 | Недельный календарь показывает очередь и platform colors | High | Draft | TASK-012 | iPhone/iPad UI verification |
| TASK-014 | Touch drag-and-drop безопасно переносит публикацию | Medium | Draft | TASK-013 | Touch + keyboard scenarios |
| TASK-015 | Automatic retry, idempotency и reconciliation защищают от дублей | Critical | Draft | Минимум один live publisher | Duplicate/timeout E2E |
| TASK-016 | Установленная PWA получает дедуплицированные Web Push события | High | Draft | Stable publication events | iOS push manual check |
| TASK-017 | History показывает preview и обновляет metrics 2–4 раза в сутки | High | Draft | Platform analytics gate | Quota-aware polling tests |
| TASK-018 | Retention удаляет video через 7 дней, сохраняя metadata/results | High | Draft | MediaAsset lifecycle | Idempotent cleanup tests |
| TASK-019 | Offline drafts/calendar и русский UI работают на iPhone/iPad | High | Draft | TASK-011, TASK-013 | Offline/mobile acceptance |
| TASK-020 | Production release измеряет ≥97% reliability и проходит iOS E2E | Critical | Draft | MVP feature tasks | Release checklist + monitoring |

## Promotion rule

Перед переводом задачи в `Ready`:

1. подтвердить dependencies и внешние credentials;
2. создать TASK из [template](templates/TASK.md);
3. заполнить scope, edge cases, compatibility и verification;
4. связать единственную задачу из CURRENT_SPRINT;
5. выполнить `pnpm docs:check`.
