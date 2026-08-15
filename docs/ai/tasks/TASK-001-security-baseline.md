# TASK-001: Security baseline

## Status

Ready

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
- `backend/src/api/routes/oauth.routes.test.ts`
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

## Technical debt

После выполнения закрыть security warning `LW-001`. Общая structured logging и
provider token refresh остаются отдельными будущими задачами; новые компромиссы
фиксируются в [TECH_DEBT](../TECH_DEBT.md).
