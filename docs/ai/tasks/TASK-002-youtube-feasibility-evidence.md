# TASK-002: YouTube feasibility evidence

## Status

In progress

## Goal

Получить проверяемое решение, может ли VideoFlow публиковать Shorts на реальный
YouTube-канал через официальный API в требуемом server-side scheduled flow, и
зафиксировать ограничения до начала production publisher.

## Context

В проекте уже есть server-side YouTube OAuth foundation со scopes
`youtube.upload` и `youtube.readonly`, encrypted token storage и безопасными
callback logs. Реального upload, token refresh и processing polling нет.

Официальная документация на дату планирования указывает, что unverified API
projects ограничивают API uploads режимом `private`, OAuth consent в статусе
Testing ограничивает refresh token семью днями, а upload UI обязан позволять
выбрать privacy. Текущий VideoFlow не хранит privacy и допускает YouTube title до
150 символов вместо API limit 100. Эти гипотезы должны быть подтверждены живым
gate, а не считаться готовой интеграцией.

## Scope

- перепроверка официальных YouTube Data API, OAuth и policy документов;
- проверка Google Cloud project, YouTube Data API v3, OAuth consent и Web client;
- живой OAuth текущего backend на отдельном test account/channel;
- проверка выдачи, хранения и ручного использования refresh token;
- один разрешённый владельцем resumable upload тестового 9:16 видео до 60 секунд;
- polling processing/status/statistics и получение video ID/URL;
- проверка фактической privacy, quota и audit/verification ограничений;
- документированный gate report с решением и requirements для TASK-003.

## Out of scope

- production YouTube publisher и вызов из worker;
- автоматический refresh lifecycle в runtime;
- изменение Publications API, Prisma schema или frontend;
- отправка OAuth verification, quota extension или YouTube compliance audit;
- публикация реального пользовательского контента;
- Instagram/TikTok feasibility;
- постоянный diagnostic uploader или новые dependencies.

## Stack

- Node.js 20 native `fetch` либо локальные `curl` requests без сохранения tokens;
- существующие Express OAuth routes и encrypted PlatformAccount tokens;
- YouTube Data API v3 OAuth 2.0, `videos.insert` и `videos.list`;
- Markdown evidence и текущий documentation validator.

## Architecture

- PWA инициирует существующий OAuth, но credentials и API calls остаются backend-side.
- Feasibility requests выполняются вручную вне production publication flow.
- Тестовый access/refresh token не передаётся frontend и не попадает в repository,
  evidence, terminal transcript или HTTP logs.
- R2 integration не реализуется: gate использует локальный безопасный fixture и
  отдельно фиксирует требования к streaming из backend/R2 для TASK-003.
- Результат gate может уточнить TASK-003, но изменение продуктового контракта
  privacy/title оформляется отдельным Change Request либо в scope TASK-003.

## Relevant files

- `docs/platform-feasibility.md`
- `docs/ai/LINKS.md`
- `docs/ai/TECH_DEBT.md`
- `docs/ai/LEGACY_WARNINGS.md`
- `backend/src/services/oauth/oauthProviders.ts`
- `backend/src/services/oauth/accountService.ts`
- `backend/src/api/routes/oauth.routes.ts`
- `backend/src/services/publications/publicationSchemas.ts`
- `frontend/src/pages/createPublicationForm.ts`
- `.env.example`

## Reuse

- существующий OAuth authorization URL, signed state и callback;
- encrypted access/refresh token columns после TASK-001;
- текущий YouTube channel profile request;
- официальный resumable upload protocol без нового SDK;
- gate report template из `docs/platform-feasibility.md`.

## Requirements

1. Использовать отдельный Google Cloud project и test channel, принадлежащие
   владельцу продукта; YouTube Data API v3 должен быть enabled.
2. OAuth client type — Web application; redirect URI должен точно совпадать с
   `YOUTUBE_REDIRECT_URL`. Client secret и tokens не записываются в документацию.
3. Зафиксировать consent publishing status, test user и verification status.
4. Подтвердить granted scopes и получение refresh token при `access_type=offline`;
   отдельно проверить семидневный срок в режиме Testing и причины revocation.
5. До live upload получить явное разрешение владельца и использовать только
   безвредный fixture 9:16 длительностью не более 60 секунд.
6. Выполнить resumable `videos.insert` с title, description и запрошенной privacy;
   подтвердить upload session URL и возможность продолжения после status query.
7. Через `videos.list` получить `processingDetails`, `status`, `statistics` и
   дождаться terminal processing status либо документированного timeout.
8. Сохранить только sanitized evidence: UTC time, HTTP status, request type,
   quota delta, video ID/URL, effective privacy и normalized error; headers,
   authorization code и tokens запрещены.
9. Проверить фактические quota buckets/limits в Google Console. Расчёт должен
   покрывать 80–120 uploads в месяц с polling и учитывать возможное изменение
   официальных defaults.
10. Проверить ограничение unverified uploads до `private`, путь compliance audit,
    OAuth verification и обязательную minimum functionality.
11. Gate report обязан перечислить текущие gaps: отсутствующий runtime refresh,
    privacy selector, title limit 150 вместо 100, publisher и status polling.
12. Решение принимает одно значение: `supported`, `supported_with_limits`,
    `blocked` или `requires_review`; для каждого limit/blocker указывается owner и
    следующий TASK/Change Request.

## Edge cases

- Google account существует, но не имеет YouTube channel;
- Brand Account управляется test user, но выбран неверный channel;
- redirect URI mismatch, consent denied или выдан не весь набор scopes;
- повторный consent не возвращает refresh token;
- refresh token истёк через семь дней, revoked или вытеснен лимитом tokens;
- upload session создана, но соединение оборвалось до завершения;
- API вернул video ID, но processing завершился `failed`/`terminated`;
- requested `public`/`unlisted` фактически стал `private` из-за отсутствия audit;
- quota в Console отличается от значения в документации;
- title содержит `<`/`>`, длиннее 100 символов или description больше 5000 bytes;
- `selfDeclaredMadeForKids`/audience не определён владельцем;
- test video ошибочно виден публично;
- evidence содержит OAuth token, code, state, client ID либо полный channel ID.

## Constraints

- Live upload — внешнее изменение и выполняется только после явного разрешения
  владельца в момент проверки.
- По умолчанию тест запрашивает `private`; проверка другой privacy также требует
  отдельного явного разрешения.
- Не коммитить media fixture, credentials, API responses или console screenshots
  с идентификаторами.
- Не добавлять Google SDK и другие dependencies.
- Не выдавать успешный HTTP upload за поддержку Shorts до processing и проверки
  effective privacy.
- При отсутствии project/account/credentials перевести TASK в `Blocked`, не
  подменять live evidence mocks или предположениями.

## Acceptance criteria

- Создан sanitized gate report с датой, официальными ссылками и одной decision.
- Текущий OAuth flow успешно подключил test channel и сохранил encrypted tokens.
- Refresh token реально обменян на новый access token либо gate явно `blocked` с
  подтверждённой причиной.
- Resumable upload реального private fixture вернул video ID и terminal status.
- Зафиксированы effective privacy, video URL, quota impact и доступные statistics.
- Audit, OAuth verification, consent Testing и token lifecycle описаны фактами.
- Mandatory UI/API gaps перед TASK-003 перечислены и имеют owner.
- В repository и logs отсутствуют credentials и raw provider responses.
- `docs/platform-feasibility.md`, `LINKS`, backlog/debt/warnings обновлены по
  результату; runtime production contracts не изменены.

## Verification

```bash
pnpm docs:check
pnpm docs:check:test
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Ручной gate:

1. Проверить Cloud project/API/OAuth configuration без копирования secrets.
2. Подключить test channel через текущий VideoFlow OAuth flow.
3. Проверить encrypted token columns и безопасные metadata/logs.
4. Обменять refresh token и не выводить его значение.
5. После разрешения владельца выполнить resumable private upload.
6. Выполнить status query/resume и polling до terminal processing status.
7. Проверить effective privacy, URL, quota console и доступные statistics.
8. Удаление тестового видео выполнять только по отдельному разрешению владельца.

## Technical debt

Task не создаёт допустимого runtime debt. Обнаруженные gaps обновляют существующие
записи или получают новый TD с owner. Известные кандидаты для TASK-003/Change
Request: refresh lifecycle, YouTube privacy contract и title limit 100.
