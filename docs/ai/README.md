# VideoFlow AI Engineering Context

Этот каталог содержит канонический инженерный контекст для коротких AI-driven
итераций. Он дополняет продуктовые первоисточники и не заменяет фактический код.

## Как использовать

1. Начать с [CURRENT_SPRINT](CURRENT_SPRINT.md).
2. Открыть единственную связанную TASK-спецификацию.
3. Загрузить только документы и файлы, перечисленные в задаче.
4. Реализовать ограниченный scope и выполнить указанные проверки.
5. Обновить [CHANGES](CHANGES.md), [TECH_DEBT](TECH_DEBT.md) и
   [LEGACY_WARNINGS](LEGACY_WARNINGS.md), если их состояние изменилось.

Подробная спецификация создаётся just-in-time только для задачи со статусом
`Ready` или `In progress`. Остальные итерации остаются компактными в
[BACKLOG](BACKLOG.md).

## Карта контекста

| Вопрос | Документ |
|---|---|
| Что и для кого строится? | [PROJECT](PROJECT.md) |
| Какие версии и инструменты используются? | [TECH_STACK](TECH_STACK.md) |
| Как устроен фактический код? | [ARCHITECTURE](ARCHITECTURE.md) |
| Как устроены данные и миграции? | [DATABASE](DATABASE.md) |
| Какие UI primitives переиспользовать? | [UI_KIT](UI_KIT.md) |
| Какие нестандартные сценарии обязательны? | [EDGE_CASES](EDGE_CASES.md) |
| Где проверенные внешние источники? | [LINKS](LINKS.md) |
| Что делаем сейчас? | [CURRENT_SPRINT](CURRENT_SPRINT.md) |
| Что будет дальше? | [BACKLOG](BACKLOG.md) |
| Какие компромиссы приняты? | [TECH_DEBT](TECH_DEBT.md) |
| Какие участки опасно распространять? | [LEGACY_WARNINGS](LEGACY_WARNINGS.md) |
| Что существенно изменилось? | [CHANGES](CHANGES.md) |

## Иерархия источников истины

1. [DiPost ТЗ v1.0](../source/DiPost_TZ_v1.0.md).
2. [Адаптированные требования](../product-requirements.md) и
   [ADR 0001](../adr/0001-architecture.md).
3. [Platform feasibility](../platform-feasibility.md).
4. Код, [Prisma schema](../../backend/prisma/schema.prisma) и package manifests
   для текущего состояния.
5. Этот инженерный контекст.
6. TASK-спецификация для границ конкретной итерации.

Если документация расходится с кодом, не исправляй поведение случайно. Зафиксируй
расхождение в LEGACY_WARNINGS или отдельном Change Request.

## Поддержка

- Обновляй документ только при изменении его ответственности.
- Не копируй одну и ту же норму в несколько файлов; используй ссылку.
- Даты указывай в формате `YYYY-MM-DD`.
- Статусы задач: `Draft`, `Ready`, `In progress`, `Blocked`, `Done`.
- После изменения документации запускай `pnpm docs:check`.
