# Database

**Source of truth:** [Prisma schema](../../backend/prisma/schema.prisma)

PostgreSQL 16 хранит пользователей, refresh-сессии, подключённые аккаунты,
publications и платформенные результаты. Все ID — UUID, даты Prisma сохраняет как
timestamps и API сериализует в ISO 8601 UTC.

## Enums

- `PublicationStatus`: `draft`, `scheduled`, `publishing`, `published`,
  `partial`, `failed`;
- `Platform`: `youtube`, `vk`, `instagram`, `tiktok`, `pinterest`;
- `PlatformResultStatus`: `pending`, `publishing`, `published`, `failed`,
  `skipped`.

Наличие enum value не означает реализованную интеграцию.

## Models

### User

- уникальный нормализованный email и bcrypt password hash;
- timezone строкой IANA;
- владеет publications, platform accounts и refresh tokens;
- удаление пользователя каскадно удаляет связанные данные.

### RefreshToken

- хранит только hash refresh token;
- имеет expiry и optional revocation timestamp;
- каждый refresh отзывает использованный token и создаёт новый;
- индексы: `tokenHash` unique, `userId`, `expiresAt`.

### PlatformAccount

- один account на комбинацию `userId + platform`;
- encrypted access token и optional encrypted refresh token;
- external ID/name, expiry, activity flag и JSON metadata;
- индекс по `platform + isActive`;
- metadata нельзя использовать для сырых token responses.

### Publication

- принадлежит User;
- содержит R2 key, общий текст, обязательный `scheduledAt`, общий status;
- platform settings и retry metadata хранятся в JSONB;
- индексы: `userId + scheduledAt`, `status + scheduledAt`;
- текущее ограничение: schema не позволяет draft без расписания.

### PublicationResult

- уникален по `publicationId + platform`;
- хранит отдельный status, external ID/URL и нормализованную ошибку;
- `rawResponse` допустим только после удаления secrets и персональных данных;
- удаляется каскадно вместе с Publication;
- индекс по status.

## Ownership and access

- Каждый API read/write publications фильтруется по authenticated `userId`.
- R2 key обязан иметь prefix текущего пользователя.
- Worker получает publication ID и повторно загружает запись из базы.
- Токены платформ никогда не возвращаются API-клиенту.

## JSONB rules

- Перед записью payload валидируется Zod schema.
- При чтении invalid platform settings не должны приводить к внешнему publish.
- Queryable ownership, lifecycle status и external result не добавляются в JSONB.
- Новые стабильные поля, по которым нужны фильтры/индексы, проектируются как
  колонки или связанные модели.
- Любой raw provider payload проходит allowlist/redaction до persistence.

## Migrations

- Использовать Prisma migrations в `backend/prisma/migrations`.
- Не редактировать уже применённую migration.
- Сначала подготовить совместимые данные, затем менять enum/constraint.
- Destructive migration обязана иметь явный раздел `Migration` и rollback/backup
  note в TASK или Change Request.
- После schema change выполнить `prisma:generate`, deploy на тестовую базу и
  проверить существующие строки.
- Production schema меняется только через `prisma migrate deploy`.

## Planned changes

Будущая модель должна добавить MediaAsset, PublicationTarget, MetricSnapshot и
PushSubscription. Конкретная schema определяется соответствующим TASK, а не этим
документом. Текущие ограничения учтены в [TECH_DEBT](TECH_DEBT.md).
