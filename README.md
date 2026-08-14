# VideoFlow

VideoFlow — PWA-сервис для подготовки, планирования и автоматической публикации
коротких вертикальных видео в несколько социальных сетей. Пользователь загружает
видео один раз, задаёт отдельные описания и время, а backend публикует контент
независимо от состояния телефона или браузера.

Проект развивается в двух горизонтах:

- сначала — быстрый PWA-first продукт для одного креатора;
- затем — коммерческий SaaS с рабочими пространствами, тарифами, лимитами и
  командной работой.

Исходное ТЗ DiPost используется как источник продуктовых пожеланий, но не как
неизменяемый контракт. Возможности платформ включаются только после проверки
официальных API, разрешений, review-процессов и реального end-to-end publish.

## Текущий статус

В репозитории уже реализованы:

- React/Vite PWA с адаптивным интерфейсом;
- email/password authentication и refresh-сессии;
- загрузка видео напрямую в Cloudflare R2;
- Publications API;
- PostgreSQL/Prisma;
- Redis/BullMQ scheduler и worker;
- статусы публикаций, retry и частичный успех;
- история, расписание и экран подключённых аккаунтов;
- экспериментальная VK-интеграция.

Текущий VK flow не определяет новый MVP: VK переведён в отложенный трек из-за
ограничений официального API. Главные кандидаты следующего этапа — Instagram
Reels, TikTok и YouTube Shorts, но каждый проходит отдельный feasibility gate.

## Продуктовые принципы

1. **PWA-first, не PWA-only.** Быстро используем готовый web-клиент. Нативный
   iOS-клиент рассматривается позже, если ограничения PWA мешают продуктовым
   метрикам.
2. **Server-side publishing.** Все отложенные публикации выполняет backend worker.
3. **Official APIs only.** Не используем браузерную автоматизацию и не обходим
   ограничения социальных платформ.
4. **Capability-aware UX.** Интерфейс показывает только реально поддерживаемые
   конкретной платформой поля, метрики и действия.
5. **SaaS-ready domain.** MVP остаётся простым, но новые сущности проектируются с
   границами workspace, тарифов и лимитов.
6. **Security before integrations.** OAuth-секреты не попадают в клиент, логи и
   незашифрованные поля базы.

## Стек

- Frontend: React 18, Vite, TypeScript, PWA, Tailwind CSS
- Backend: Node.js 20, Express, TypeScript
- Data: PostgreSQL 16, Prisma
- Queue: Redis 7, BullMQ
- Media storage: Cloudflare R2
- Deployment: Docker Compose, Nginx, HTTPS
- Notifications: in-app status, Web Push; email fallback — продуктовая опция

## Структура репозитория

```text
frontend/       React + Vite PWA
backend/        REST API, application services, workers, platform adapters
infrastructure/ Docker Compose and deployment assets
docs/           Current product and architecture documentation
.local/         Ignored historical plans and private working notes
```

## Локальный запуск

```bash
cp .env.example .env
pnpm install
docker compose -f infrastructure/docker-compose.yml up -d postgres redis
pnpm --filter @videoflow/backend prisma:generate
pnpm --filter @videoflow/backend prisma:deploy
pnpm dev
```

По умолчанию:

- frontend: `http://localhost:5173`
- backend: `http://localhost:3000`
- PostgreSQL: `localhost:5433`
- Redis: `localhost:6379`

Для worker в отдельном терминале:

```bash
pnpm --filter @videoflow/backend worker:dev
```

## Проверки

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Документация

- [Продуктовые требования](docs/product-requirements.md)
- [Целевая архитектура](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Platform feasibility gates](docs/platform-feasibility.md)
- [ADR 0001: исходная архитектура](docs/adr/0001-architecture.md)
- [ADR 0002: PWA-first и SaaS-ready направление](docs/adr/0002-pwa-first-saas-ready.md)
