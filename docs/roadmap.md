# VideoFlow Roadmap

Roadmap описывает порядок снижения рисков, а не обещание календарных дат.
Платформенная интеграция входит в релиз только после successful feasibility gate.

## Current baseline

Уже существует:

- PWA shell и основные экраны;
- email/password auth;
- direct upload в R2;
- Publications API;
- BullMQ scheduler и worker;
- history/status/retry;
- platform account framework;
- экспериментальный VK adapter.

Ограничения baseline:

- текущий VK flow не является целевой MVP-интеграцией;
- YouTube publisher не реализован;
- Instagram и TikTok publishers не реализованы;
- drafts, reschedule, retention, analytics и notifications требуют развития;
- OAuth logging/metadata hardening обязательно до новых интеграций.

## Phase 0: Re-baseline and security

**Цель:** привести существующее ядро к безопасной точке продолжения.

- принять Product Requirements v2 и ADR 0002;
- удалить raw OAuth tokens из metadata;
- редактировать OAuth code/state/token в request logs;
- проверить encryption, session cookies и redirect URLs;
- пометить VK как отложенную интеграцию;
- добавить CI-проверки typecheck, tests и build;
- определить release environments и secret management;
- подготовить manual security checklist.

**Выход:** существующий код безопасно используется как новый baseline.

## Phase 1: Platform feasibility

**Цель:** не повторить ситуацию с VK.

Для Instagram, TikTok и YouTube:

- зарегистрировать developer application;
- подтвердить тип и состояние аккаунта заказчика;
- получить минимальные test scopes;
- пройти OAuth на реальном аккаунте;
- выполнить server-side test publish;
- подтвердить public visibility;
- проверить обработку media и получение final status;
- проверить доступные analytics;
- описать review/audit path и сроки;
- зафиксировать decision: supported, limited или blocked.

**Выход:** утверждённый состав интеграций creator MVP.

## Phase 2: Creator workflow MVP

**Цель:** полный ежедневный сценарий одного креатора.

### Domain и API

- personal workspace;
- MediaAsset lifecycle;
- настоящие drafts с optional schedule;
- platform targets и capabilities;
- edit, schedule, reschedule, cancel;
- retry failed targets;
- timezone `Europe/Moscow`;
- retention deadline.

### PWA

- русский интерфейс;
- упрощённая форма multi-post;
- отдельные platform descriptions;
- 9:16/duration validation;
- draft list;
- queue;
- недельный calendar;
- сначала edit time, затем drag-and-drop;
- понятный reconnect flow;
- responsive проверка iPhone/iPad.

### Publishing

- adapters для платформ, прошедших gate;
- token refresh;
- idempotency и reconciliation;
- per-platform retry classification;
- platform concurrency/rate limits;
- real end-to-end tests.

**Выход:** пользователь загружает, планирует и публикует без открытого браузера.

## Phase 3: Reliability, notifications and analytics

- Web Push для установленной PWA;
- in-app notification center;
- optional email fallback;
- token expiry warnings;
- metric polling 2–4 раза в сутки с quota awareness;
- history previews and metrics;
- R2 retention cleanup;
- structured logs and secret redaction;
- error tracking, queue metrics and alerting;
- backup/restore test;
- reliability dashboard и формула 97%;
- production deployment over HTTPS.

**Выход:** ограниченный production release для creator cohort.

## Phase 4: SaaS foundation

- workspace tenant isolation;
- organizations and memberships;
- owner/admin/editor/viewer roles;
- onboarding;
- plans, entitlements and usage metering;
- publication, storage, account and member limits;
- billing and webhooks;
- trial/grace period;
- admin/support tools;
- privacy policy, terms, account export/deletion;
- tenant-aware observability and audit logs.

**Выход:** продукт можно продавать нескольким независимым клиентам.

## Phase 5: Platform and product expansion

- VK после появления допустимого официального Clips flow;
- Pinterest Video Pins;
- Threads;
- templates;
- recurring schedule;
- best-time suggestions;
- advanced analytics;
- additional social accounts per platform on higher plans.

## Native iOS decision gate

Native-клиент не привязан к фиксированной фазе. Решение принимается по данным:

- upload failure rate в PWA;
- доля пользователей, установивших PWA;
- Web Push delivery/opt-in;
- влияние PWA UX на completion time;
- спрос на App Store, Share Extension, native background upload и Camera flow.

Если gate пройден, создаётся отдельный iOS-клиент поверх существующего API.
