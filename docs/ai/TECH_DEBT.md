# Technical Debt

Здесь фиксируются только осознанные компромиссы. При устранении запись получает
статус `Resolved` и ссылку на задачу/изменение, а не удаляется.

## TD-001: Platform targets хранятся в Publication JSONB

- Status: Open
- Priority: High
- Created: 2026-08-15
- Affected: publications, history, analytics
- Reason: первоначальный MVP использовал быстро меняющиеся platform settings.
- Risk: сложные фильтры, слабая целостность и смешение target/result lifecycle.
- Proposed fix: в TASK-011 спроектировать типизированный PublicationTarget;
  оставить JSON только для нестабильных provider settings.

## TD-002: Настоящие drafts невозможны

- Status: Open
- Priority: Critical
- Created: 2026-08-15
- Affected: Prisma Publication, create API, CreatePage
- Reason: `scheduledAt`, video key и default text обязательны, create всегда
  устанавливает `scheduled`.
- Risk: критерий draft из ТЗ не может быть выполнен поверх текущего контракта.
- Proposed fix: TASK-011 с миграцией и отдельными create/schedule commands.

## TD-003: P0 publishers отсутствуют

- Status: Open
- Priority: Critical
- Created: 2026-08-15
- Affected: platformPublisher, worker, Accounts/Create UI
- Reason: feasibility gates ещё не закрыты.
- Risk: UI создаёт scheduled publication, которая завершается
  `PlatformWorkerNotImplemented`.
- Proposed fix: TASK-002–TASK-009; не считать UI/OAuth поддержкой платформы.

## TD-004: Пользовательский интерфейс преимущественно английский

- Status: Open
- Priority: High
- Created: 2026-08-15
- Affected: all frontend pages and navigation
- Risk: не выполняется требование русского основного языка; строки не готовы к
  последовательной локализации.
- Proposed fix: TASK-019, без добавления универсальной i18n library до выбора в
  спецификации.

## TD-005: Offline ограничен application shell

- Status: Open
- Priority: High
- Created: 2026-08-15
- Affected: Service Worker, drafts, schedule/history cache
- Risk: offline drafts и последний календарь недоступны, cache-first поведение не
  version-aware для всех данных.
- Proposed fix: TASK-019 с IndexedDB, conflict policy и explicit sync states.

## TD-006: Нет E2E и формального coverage threshold

- Status: Open
- Priority: High
- Created: 2026-08-15
- Affected: frontend journeys, API/worker integration, iOS acceptance
- Risk: unit tests не подтверждают полный upload→schedule→publish flow и mobile
  compatibility.
- Proposed fix: добавлять integration/E2E по мере вертикальных задач; итоговый
  release gate — TASK-020.

## TD-007: Retry не соответствует целевой reliability policy

- Status: Open
- Priority: Critical
- Created: 2026-08-15
- Affected: publicationQueue, publicationService, worker
- Reason: retry запускается пользователем, job не versioned, reconciliation нет.
- Risk: duplicate external post после timeout и stale execution после reschedule.
- Proposed fix: TASK-015 после появления live publisher.
