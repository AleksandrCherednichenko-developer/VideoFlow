# TASK-001: Security baseline

## Status

In progress

## Goal

Как владелец VideoFlow, я хочу исключить OAuth credentials из базы и HTTP access
logs, чтобы безопасно продолжать P0-интеграции без изменения пользовательского
account flow.

## Context

`completeOAuthCallback` шифрует access/refresh tokens в колонках, но одновременно
сохраняет сырой token response и profile response в `PlatformAccount.metadata`.
Стандартный `morgan("combined")` логирует callback URL вместе с query, включая
OAuth `code` и `state`. Это противоречит security boundary в
[ARCHITECTURE](../ARCHITECTURE.md).

## Scope

- sanitization OAuth metadata до Prisma write;
- redaction чувствительных query parameters в request logger;
- data migration существующих PlatformAccount metadata;
- unit/integration tests новых правил;
- обновление связанной security documentation после выполнения.

## Out of scope

- новые OAuth providers или platform publishers;
- token refresh lifecycle;
- изменение auth/account HTTP contracts;
- изменение Prisma models/columns;
- общая observability platform или structured logger;
- рефакторинг OAuth service в repository/module architecture.

## Stack

- Node.js 20 contract;
- Express 4 и Morgan 1;
- Prisma 6 / PostgreSQL 16;
- TypeScript strict;
- Vitest 2 и Supertest 7;
- новые dependencies запрещены.

## Architecture

- Route handlers не выполняют sanitization вручную.
- Allowlist metadata формируется в OAuth application service или отдельной pure
  helper рядом с ним.
- Logger redaction находится в API middleware.
- Migration заменяет legacy metadata безопасным объектом до дальнейших OAuth
  подключений.
- Encryption service остаётся единственным способом хранения platform tokens.

## Relevant files

- `backend/src/services/oauth/accountService.ts`
- `backend/src/services/oauth/accountService.test.ts`
- `backend/src/api/middleware/requestLogger.ts`
- `backend/src/api/middleware/requestLogger.test.ts` (new)
- `backend/src/api/routes/oauth.routes.test.ts`
- `backend/src/services/oauth/oauthMetadataMigration.test.ts` (new)
- `backend/prisma/migrations/`

## Reuse

- `encryptSecret` / `decryptSecret` из security service;
- существующий OAuth provider contract и account upsert;
- Morgan custom format/token/stream API;
- Vitest mocks текущих account service tests;
- Prisma SQL migration conventions проекта.

## Requirements

1. Не сохранять `tokens.rawResponse` и `profile.rawResponse`.
2. Новая metadata имеет только allowlisted форму:
   `provider` и optional `profile.externalAccountId` /
   `profile.externalAccountName`; undefined значения не записываются.
3. Access/refresh token, authorization code, state и provider secrets не могут
   попасть в metadata независимо от их key в raw response.
4. Request logger заменяет значения query keys `code`, `state`, `access_token`,
   `refresh_token` и `token` на `[REDACTED]`, сохраняя path, безопасные query,
   method, status, response size, referrer, user agent и response time.
5. Сравнение чувствительных query keys case-insensitive.
6. Migration заменяет metadata всех существующих PlatformAccount безопасным
   объектом, построенным из `platform`, `external_account_id` и
   `external_account_name`; raw legacy object не переносится.
7. Public `AccountResponse` и существующие routes не меняются.

## Edge cases

- token response содержит секрет под неизвестным provider-specific key;
- profile response содержит вложенный access token;
- optional external ID/name отсутствуют;
- callback URL malformed или содержит повторяющиеся sensitive query keys;
- query использует percent encoding;
- обычный request без sensitive query логируется без изменения смысла;
- metadata `null`, массив или неожиданная legacy shape;
- migration запускается повторно на уже очищенных данных.

## Constraints

- Не добавлять dependencies.
- Не логировать реальные секреты в tests или fixtures.
- Не удалять encrypted token columns.
- Не менять schema Prisma и публичный REST API.
- Migration должна быть reviewable и безопасной для существующих строк.

## Acceptance criteria

- Новый OAuth account сохраняет encrypted tokens только в специальных колонках.
- Metadata содержит только определённый allowlist и не содержит raw responses.
- Access log не содержит исходные OAuth code/state/token values.
- Migration полностью заменяет legacy metadata и сохраняет account identity.
- Account list/connect/disconnect behavior и response shape не изменились.
- Security regression tests проходят вместе с полным набором проекта.

## Implementation plan

### 1. Зафиксировать уязвимое поведение тестами

- расширить `accountService.test.ts`: проверить точную allowlisted metadata для
  create/update, отсутствие обоих raw responses и поведение без optional profile;
- добавить `requestLogger.test.ts` с захватом stream: sensitive query,
  case-insensitive keys, повторяющиеся параметры, percent encoding, безопасный
  query и malformed URL;
- сначала получить ожидаемые failures, не меняя production code.

### 2. Закрыть persisted metadata

- заменить `buildAccountMetadata(tokens, profile)` на helper, принимающий только
  `platform` и безопасные поля `OAuthAccountProfile`;
- формировать `{ provider, profile? }` через явный allowlist без spread/raw copy;
- использовать один helper в `create` и `update`; encryption и refresh-token
  semantics не менять;
- проверять результат через аргументы существующего Prisma `upsert` mock.

### 3. Закрыть OAuth URL logs

- реализовать pure `sanitizeRequestUrl`, который redacts все значения
  `code`, `state`, `access_token`, `refresh_token`, `token` без учёта регистра;
- сохранить порядок, повторения и безопасные query parameters;
- при невозможности разобрать URL логировать только path до `?`;
- заменить `combined` на эквивалентный custom Morgan format с sanitized URL и
  `response-time`; сохранить экспорт готового `requestLogger` и добавить factory
  с injectable stream только для тестирования.

### 4. Очистить существующие строки

- создать отдельную Prisma migration
  `20260815000000_sanitize_oauth_account_metadata`;
- одним `UPDATE platform_accounts` заменить metadata через
  `jsonb_strip_nulls(jsonb_build_object(...))` данными из `platform`,
  `external_account_id` и `external_account_name`;
- добавлять `profile` только когда присутствует ID или name; raw JSON не читать и
  не переносить;
- migration должна быть идемпотентной и не менять token columns, identity,
  timestamps или Prisma schema;
- добавить contract-test SQL assumptions и проверить migration на отдельной
  legacy fixture в PostgreSQL перед применением к рабочей базе.

### 5. Регрессия и закрытие задачи

- подтвердить неизменность connect/list/disconnect response contracts;
- выполнить автоматические и ручные проверки из `Verification`;
- перевести TASK и backlog в `Done`, убрать `LW-001`, обновить `CHANGES` и при
  необходимости `TECH_DEBT` только после фактической проверки базы и логов;
- переключить `CURRENT_SPRINT` на следующую задачу отдельным planning change.

## Verification

```bash
pnpm --filter @videoflow/backend typecheck
pnpm --filter @videoflow/backend test
pnpm --filter @videoflow/backend build
pnpm docs:check
```

Ручная проверка:

1. Выполнить OAuth callback с тестовыми code/state.
2. Проверить access log: реальные значения отсутствуют.
3. Проверить PlatformAccount: encrypted columns заполнены, metadata allowlisted.
4. Применить migration к копии legacy-строки и убедиться, что raw payload удалён.

### Verification result — 2026-08-15

- Targeted security tests: 19 passed.
- Full regression: backend 77 passed, frontend 18 passed.
- Typecheck, production build, `docs:check`, `docs:check:test`: passed.
- OAuth route integration log: callback `code`/`state` отображаются только как
  `%5BREDACTED%5D`; status, response size и response time сохранены.
- PostgreSQL fixture: legacy object/array metadata очищены; повторная migration
  дала идентичный результат.
- Coverage report не создан: `@vitest/coverage-v8` отсутствует, а добавление
  dependency запрещено scope; общий coverage threshold остаётся `TD-006`.

## Technical debt

После выполнения закрыть security warning `LW-001`. Общая structured logging и
provider token refresh остаются отдельными будущими задачами; новые компромиссы
фиксируются в [TECH_DEBT](../TECH_DEBT.md).
