# Agent Instructions

VideoFlow использует минимальный достаточный контекст для каждой итерации.

## Перед выполнением задачи

1. Открой [текущий спринт](docs/ai/CURRENT_SPRINT.md).
2. Прочитай ровно одну связанную спецификацию из `docs/ai/tasks/`.
3. Прочитай только документы, перечисленные в `Relevant files` и самой задаче.
4. Сначала проверь фактический код и предложи план ограниченных изменений.

Не сканируй весь репозиторий без отдельной задачи Context Dump. Не переноси в
новую итерацию историю старого диалога, если она не отражена в документации.

## Источники истины

При конфликте используй следующий приоритет:

1. [утверждённое ТЗ](docs/source/DiPost_TZ_v1.0.md);
2. [адаптированные требования](docs/product-requirements.md) и
   [ADR](docs/adr/0001-architecture.md);
3. [platform feasibility](docs/platform-feasibility.md);
4. код, Prisma schema и package manifests для фактического состояния;
5. [AI engineering context](docs/ai/README.md);
6. спецификация текущей задачи.

TASK не может менять продуктовый scope или принятое архитектурное решение без
отдельного Change Request и, при необходимости, ADR.

## Правила реализации

- Не изменяй файлы вне `Scope` без явного обоснования в спецификации.
- Не смешивай фичу, несвязанный рефакторинг и обновление зависимостей.
- Не добавляй зависимости без явного разрешения задачи.
- Переиспользуй существующие API-модули, сервисы и UI primitives.
- Сохраняй strict TypeScript и существующие публичные контракты.
- Новые платформенные интеграции используют только официальные API.
- Не сохраняй и не логируй access token, refresh token, OAuth code или state.
- Не распространяй подходы из [legacy warnings](docs/ai/LEGACY_WARNINGS.md).

## Завершение задачи

1. Выполни команды из раздела `Verification` спецификации.
2. Запусти `pnpm docs:check` при изменении документации.
3. Обнови [CHANGES](docs/ai/CHANGES.md) для существенных изменений.
4. Запиши компромиссы в [TECH_DEBT](docs/ai/TECH_DEBT.md).
5. Обнови [LEGACY_WARNINGS](docs/ai/LEGACY_WARNINGS.md), если обнаружен новый
   риск или устранено старое предупреждение.
6. Переведи задачу в `Done` только после выполнения Acceptance criteria.

## Навигация

- [Project](docs/ai/PROJECT.md)
- [Stack](docs/ai/TECH_STACK.md)
- [Architecture](docs/ai/ARCHITECTURE.md)
- [Database](docs/ai/DATABASE.md)
- [UI kit](docs/ai/UI_KIT.md)
- [Edge cases](docs/ai/EDGE_CASES.md)
- [Current sprint](docs/ai/CURRENT_SPRINT.md)
- [Backlog](docs/ai/BACKLOG.md)
