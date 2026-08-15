# Project

## Product

VideoFlow — PWA для одного креатора UJC Creator. Она сокращает ручную публикацию
короткого товарного видео в несколько социальных сетей до одного сценария:
загрузить видео, подготовить платформенные описания, назначить московское время и
получить результаты автоматической server-side публикации.

Продуктовые источники: [исходное ТЗ](../source/DiPost_TZ_v1.0.md) и
[согласованная PWA-адаптация](../product-requirements.md).

## Primary user

- solo-креатор, живущий во Вьетнаме;
- основные устройства: iPhone 12+ и iPad;
- рабочая timezone: `Europe/Moscow`;
- объём: 80–120 коротких видео в месяц;
- основной язык интерфейса: русский.

## Core journeys

1. Войти через Sign in with Apple или email/password.
2. Подключить ровно один аккаунт каждой поддерживаемой платформы.
3. Выбрать вертикальное видео 9:16 длительностью не более 60 секунд.
4. Сохранить draft либо выбрать платформы, описания, обложки и время.
5. Управлять очередью и недельным календарём.
6. Получить Web Push и увидеть URL/status по каждой платформе.
7. Просматривать историю и базовые метрики.

## Platform scope

| Priority | Platform | Target format | Current implementation |
|---|---|---|---|
| P0 | YouTube | Shorts/video upload | OAuth foundation, publisher отсутствует |
| P0 | Instagram | Reels | UI/schema placeholder, OAuth и publisher отсутствуют |
| P0 | TikTok | Direct Post | UI/schema placeholder, OAuth и publisher отсутствуют |
| P1 | VK | Clips | Этап 2, реализации нет |
| P1 | Pinterest | Video Pin | Этап 2, реализации нет |

Интеграция считается поддержанной только после официального live publish и
успешного [feasibility gate](../platform-feasibility.md).

## System composition

- React/Vite PWA для интерфейса;
- Express REST API для auth, upload, accounts и publications;
- PostgreSQL/Prisma для пользователей, сессий, аккаунтов и публикаций;
- Redis/BullMQ для отложенных jobs;
- отдельный worker для независимой от браузера публикации;
- Cloudflare R2 для видео.

## Current baseline

Реализованы email/password auth, refresh rotation, direct-to-R2 upload,
создание/просмотр/удаление scheduled publications, очередь, worker, статусы,
история, ручной retry и YouTube OAuth foundation. Текущий экран Schedule — список,
а не недельный календарь. Service Worker кэширует shell, но не предоставляет
offline drafts или синхронизацию календаря.

## Boundaries

Не входят без нового утверждённого требования:

- native iOS и Android;
- desktop web как отдельный продукт;
- SaaS, workspaces, команды, роли, billing и тарифы;
- Threads;
- AI-тексты, шаблоны и recurring posts;
- video editor, captions и watermarking;
- долгосрочная медиатека.

## Success measures

- создание мульти-поста не дольше 3 минут;
- технически допустимые публикации успешны минимум в 97% случаев;
- schedule подтверждается не дольше 15 секунд без учёта upload;
- ключевые сценарии проходят на iPhone и iPad;
- публикация не зависит от открытого браузера или состояния телефона.
