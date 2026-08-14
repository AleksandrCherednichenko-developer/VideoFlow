# VideoFlow Roadmap

Roadmap следует утверждённому ТЗ DiPost v1.0 с PWA вместо native iOS.

## Phase 0: очистка baseline

- удалить экспериментальный VK wall/link-post flow;
- убрать Threads, email fallback и SaaS-направление;
- оставить P0 scope: Instagram, TikTok, YouTube;
- проверить secret redaction и OAuth metadata;
- поддерживать зелёные typecheck, tests и build.

## Phase 1: feasibility P0

Для Instagram, TikTok и YouTube:

- зарегистрировать developer application;
- получить минимальные scopes;
- пройти OAuth на реальном аккаунте;
- выполнить server-side test publish;
- проверить public visibility и final status;
- подтвердить analytics и review/audit path.

## Phase 2: creator MVP

- Sign in with Apple;
- MediaAsset и строгая проверка 9:16 / 60 секунд;
- platform-specific covers;
- drafts и отдельные descriptions;
- timezone `Europe/Moscow`;
- edit, reschedule и cancel;
- очередь, недельный календарь и drag-and-drop;
- publishers для платформ, прошедших gate;
- автоматические retry, idempotency и reconciliation;
- Web Push;
- history и метрики 2–4 раза в сутки;
- удаление исходного видео через 7 дней;
- русский light/dark UI для iPhone и iPad.

## Phase 3: production hardening

- измерение успешности публикации ≥97%;
- E2E на iPhone и iPad;
- structured logs, queue metrics и alerts;
- backup/restore test;
- HTTPS production deployment;
- проверка offline drafts и календаря.

## Phase 4: этап 2 ТЗ

- VK Clips только после подтверждения официального publish flow;
- Pinterest Video Pin;
- предложения лучшего времени;
- улучшенный мониторинг ошибок.

SaaS, команды, тарифы, billing, native-клиент и Threads в roadmap не входят.
