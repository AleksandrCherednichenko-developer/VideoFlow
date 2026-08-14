# VideoFlow

VideoFlow — PWA-сервис для подготовки, планирования и автоматической публикации
коротких вертикальных видео в социальные сети. Пользователь загружает видео один
раз, задаёт отдельные описания и время, а backend публикует контент независимо от
состояния телефона или браузера.

Продукт создаётся для одного креатора UJC Creator, работающего с iPhone и iPad и
публикующего 80–120 видео в месяц по московскому времени.

## Источник требований

Основной источник продуктовых требований — утверждённое ТЗ `DiPost_TZ_v1.0.md`
от 25 июля 2026 года.

Согласовано одно отклонение: первая реализация использует responsive PWA вместо
native iOS-приложения. Поэтому APNs заменяется Web Push для установленной PWA, а
Keychain — безопасной web-сессией; токены социальных платформ по-прежнему
хранятся только зашифрованными на backend.

## Платформы

- MVP: Instagram Reels, TikTok и YouTube Shorts;
- этап 2: VK Clips и Pinterest Video Pin;
- Threads не входит в текущий scope.

Интеграция считается реализованной только после успешной публикации через
официальный Content Publishing API. Экспериментальные link-post сценарии не
считаются поддержкой платформы.

## Текущий baseline

Уже реализованы:

- React/Vite PWA с адаптивным интерфейсом;
- email/password authentication и refresh-сессии;
- загрузка видео напрямую в Cloudflare R2;
- Publications API;
- PostgreSQL/Prisma;
- Redis/BullMQ scheduler и отдельный worker;
- платформенные статусы, история и ручной retry;
- YouTube OAuth foundation.

Publishers Instagram, TikTok и YouTube пока не реализованы. Черновики, недельный
календарь, Web Push, аналитика и семидневный retention также требуют разработки.

## Стек

- Frontend: React 18, Vite, TypeScript, PWA, Tailwind CSS
- Backend: Node.js 20, Express, TypeScript
- Data: PostgreSQL 16, Prisma
- Queue: Redis 7, BullMQ
- Media storage: Cloudflare R2
- Deployment: Docker Compose, HTTPS reverse proxy

## Структура

```text
frontend/       React + Vite PWA
backend/        REST API, services, workers and platform adapters
infrastructure/ Docker Compose
docs/           Product, architecture and delivery documentation
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

По умолчанию frontend доступен на `http://localhost:5173`, backend — на
`http://localhost:3000`. Worker запускается отдельно:

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

- [Адаптированные требования](docs/product-requirements.md)
- [Архитектура](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Platform feasibility](docs/platform-feasibility.md)
- [ADR 0001: PWA для первой реализации](docs/adr/0001-architecture.md)
