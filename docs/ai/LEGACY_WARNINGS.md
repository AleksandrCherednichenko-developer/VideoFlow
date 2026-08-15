# Legacy Warnings

Legacy warning описывает опасное текущее поведение. Оно не разрешает агенту
начинать несвязанный рефакторинг; исправление выполняется отдельной задачей.

## LW-001: OAuth secrets дублируются в metadata и URL logs

- Severity: Critical
- Status: Open
- Owner task: [TASK-001](tasks/TASK-001-security-baseline.md)
- Affected: `accountService.ts`, `requestLogger.ts`, existing PlatformAccount rows
- Current behavior: raw token/profile responses записываются в JSON metadata;
  Morgan combined логирует OAuth callback query с code/state.
- Rule: не копировать этот подход в новые providers и не выполнять live OAuth с
  production credentials до закрытия TASK-001.

## LW-002: Frontend default API port не совпадает с README

- Severity: Medium
- Status: Open
- Affected: `frontend/src/api/httpClient.ts`, local setup
- Current behavior: frontend fallback использует `http://localhost:3001`, backend
  и README используют port `3000`.
- Risk: fresh local setup получает network error без `VITE_API_URL`.
- Required action: исправить отдельным минимальным Change Request; до этого явно
  задавать `VITE_API_URL=http://localhost:3000`.

## LW-003: UI позволяет выбрать платформы без publisher

- Severity: High
- Status: Open
- Affected: CreatePage, AccountsPage, platformPublisher
- Current behavior: Instagram/TikTok/YouTube можно включить, но worker возвращает
  `PlatformWorkerNotImplemented` для каждой платформы.
- Rule: в тестовых сценариях не обозначать публикацию успешной; production UI
  должен учитывать capabilities/gate.

## LW-004: DRAFT enum не означает рабочий draft lifecycle

- Severity: High
- Status: Open
- Affected: Prisma Publication, publication schemas/service
- Current behavior: `scheduledAt`, `videoR2Key`, `defaultText` обязательны, а create
  всегда сохраняет status `scheduled`.
- Rule: не добавлять draft UI поверх текущего create endpoint без TASK-011.

## LW-005: Media validation проверяет только MIME и размер

- Severity: High
- Status: Open
- Affected: upload schemas/service, CreatePage
- Current behavior: отсутствуют server-verified duration, dimensions и 9:16;
  complete проверяет существование R2 object, но не весь media contract.
- Rule: file picker `accept="video/*"` и browser preview не считаются строгой
  валидацией из ТЗ.

## LW-006: Queue jobs не имеют publication version

- Severity: High
- Status: Open
- Affected: publicationQueue, publicationService, worker
- Current behavior: основной job ID зависит только от publication ID; reschedule
  API отсутствует; worker не проверяет expected version.
- Rule: не добавлять reschedule без stale-job protection и compensation policy.

## LW-007: Publishing rawResponse не имеет общего sanitizer contract

- Severity: High
- Status: Open
- Affected: PublicationResult persistence and response
- Current behavior: `rawResponse` может сохраняться и возвращаться frontend;
  реальных P0 publishers пока нет.
- Rule: до первого live publisher определить allowlist/redaction и не сохранять
  provider response целиком.
