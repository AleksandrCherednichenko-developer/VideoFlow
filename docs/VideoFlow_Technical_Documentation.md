# VideoFlow
## Автоматизация публикации видео в 6 социальных сетей

> *PWA · Без App Store · Бесплатный деплой на iPhone/iPad*

**Полная техническая документация — v1.2**

| | |
|---|---|
| **Версия** | v1.2 — PWA, уточнены поля платформ, Threads = авто-дубль Instagram |
| **Дата** | Июнь 2026 |
| **Фронтенд** | React (Vite) + PWA (Service Worker + Web App Manifest) |
| **Бэкенд** | Node.js 20 + Express + BullMQ + PostgreSQL + Redis |
| **Хранилище файлов** | Cloudflare R2 (S3-совместимый) |
| **Платформы** | YouTube · Instagram · Threads · ВКонтакте · TikTok · Pinterest |
| **Деплой** | VPS (Ubuntu 22) — без Apple Developer аккаунта |
| **Уведомления** | PWA Push (iOS 16.4+) + статус в UI + Email (fallback) |

---

## Содержание

1. [Обзор продукта](#1-обзор-продукта)
2. [PWA — архитектура и ограничения](#2-pwa--архитектура-и-ограничения)
3. [Технический стек](#3-технический-стек)
4. [Архитектура системы](#4-архитектура-системы)
5. [Система уведомлений](#5-система-уведомлений)
6. [Platform Workers — логика публикации](#6-platform-workers--логика-публикации)
7. [Интерфейс PWA](#7-интерфейс-pwa)
8. [Безопасность](#8-безопасность)
9. [Деплой](#9-деплой)
10. [Дорожная карта](#10-дорожная-карта)
11. [Риски и решения](#11-риски-и-решения)
12. [Быстрый старт](#12-быстрый-старт--первые-шаги)

---

# 1. Обзор продукта

## 1.1 Концепция

VideoFlow — Progressive Web App (PWA), которое устанавливается на iPhone и iPad через Safari без App Store и без Apple Developer аккаунта. Пользователь добавляет видео, прикрепляет текст, выбирает платформы из 6, задаёт время — бэкенд публикует автоматически и уведомляет о результате.

> ✅ **PWA** — это обычный сайт, который Safari позволяет "установить" на экран как приложение: своя иконка, полноэкранный режим, работа без адресной строки. Никакого App Store, никакой оплаты Apple.

## 1.2 Поля публикации по платформам

| Платформа | Название | Описание | Примечание |
|---|---|---|---|
| **YouTube** | ✅ Да | ✅ Да | Название обязательно. Полное описание с тегами. |
| **Instagram** | ❌ Нет | ✅ Да | Только описание + хэштеги. Без названия. |
| **Threads** | ❌ Нет | 🔁 Авто | Автоматически дублирует описание из Instagram. Отдельный ввод не нужен. |
| **ВКонтакте** | ❌ Нет | ✅ Да | Описание публикуется как текст записи на стене. |
| **TikTok** | ❌ Нет | ✅ Да | Описание + хэштеги. Название не поддерживается API. |
| **Pinterest** | ✅ Да | ✅ Да | Название и описание для Video Pin. Нужна доска. |

## 1.3 Логика текста/описания

- Пользователь вводит один общий текст при создании публикации
- Этот текст используется для всех выбранных платформ по умолчанию
- Для любой платформы можно нажать «Изменить» и ввести отдельный текст
- Threads не имеет отдельного поля — всегда берёт текст из Instagram автоматически
- YouTube и Pinterest дополнительно имеют поле «Название» (обязательное)

## 1.4 Фазы разработки

| Фаза | Срок | Метка | Платформы и функциональность |
|---|---|---|---|
| **Фаза 1 — MVP** | 0–2 мес | `MVP` | YouTube + ВКонтакте, PWA установка, базовое расписание, статус в UI |
| **Фаза 2** | 2–4 мес | `v2` | Instagram + Threads (авто) + TikTok, push-уведомления PWA, email |
| **Фаза 3** | 4–6 мес | `v3` | Pinterest + выбор досок, per-platform текст, история публикаций |
| **Фаза 4** | 6–12 мес | `SaaS` | Мультиюзер, биллинг, публичный доступ |

---

# 2. PWA — архитектура и ограничения

## 2.1 Что такое PWA и как это работает на iOS

Progressive Web App — веб-приложение с файлом манифеста (`manifest.json`) и Service Worker. Safari на iPhone/iPad позволяет сохранить его на экран через меню «Поделиться → На экран "Домой"». После этого приложение запускается полноэкранно, как нативное, со своей иконкой.

## 2.2 Преимущества PWA для этого проекта

- **Ноль затрат на Apple** — не нужен Developer аккаунт (99$/год)
- **Обновления мгновенные** — обновил сайт на сервере, пользователь сразу получает новую версию
- **Работает на любом устройстве**: iPhone, iPad, Android, Mac, Windows — один код
- **Установка за 3 секунды** — Safari → Поделиться → На экран
- **Доступ к файлам** через `<input type="file">` — выбор видео из Files.app работает

## 2.3 Ограничения PWA на iOS — и как мы их решаем

| Ограничение | Влияние | Решение |
|---|---|---|
| Push-уведомления только iOS 16.4+ и только если добавлено на экран | Среднее | Показываем инструкцию при входе. Fallback: email + статус в UI. |
| Нет фоновой синхронизации (Background Sync ограничен) | Низкое | Публикация выполняется бэкендом. Приложение только создаёт задачу. |
| Safari ограничивает хранилище (до 50 МБ localStorage) | Низкое | Все данные хранятся на бэкенде. В браузере только JWT-токен. |
| Нет доступа к медиатеке напрямую (Photos API) | Среднее | `<input type="file" accept="video/*">` открывает Files.app + Фото. |
| iOS Safari не поддерживает некоторые Web APIs | Низкое | Тестировать каждый компонент на реальном iPhone/iPad. |

## 2.4 Как установить PWA на iPhone — инструкция для пользователя

1. Открыть браузер **Safari** (только Safari поддерживает установку PWA на iOS)
2. Перейти по адресу приложения, например: `app.videoflow.io`
3. Войти в аккаунт
4. Нажать кнопку **«Поделиться»** (значок квадрата со стрелкой вверх)
5. Выбрать **«На экран "Домой"»**
6. Нажать **«Добавить»** — иконка появится на рабочем столе
7. Для push-уведомлений: открыть приложение **с экрана** (не из Safari) → разрешить уведомления

> ⚠️ **Важно:** Chrome и Firefox на iOS **НЕ поддерживают** установку PWA и push-уведомления. Только Safari. Это нужно указать в инструкции для пользователей.

---

# 3. Технический стек

## 3.1 Полный стек с обоснованием

| Слой | Технология | Обоснование |
|---|---|---|
| **PWA фронтенд** | React 18 + Vite | Быстрая сборка, горячая перезагрузка, SPA |
| **PWA манифест** | manifest.json + Service Worker | Установка на экран, offline shell, push |
| **UI библиотека** | Tailwind CSS + shadcn/ui | Быстрая адаптивная вёрстка под iPhone/iPad |
| **Состояние** | Zustand + React Query (TanStack) | Zustand для UI, React Query для API кэша |
| **HTTP клиент** | Axios + interceptors | Auto-refresh JWT, retry, error handling |
| **Push (браузер)** | Web Push API + VAPID | Стандарт для PWA push, работает в Safari 16.4+ |
| **Бэкенд** | Node.js 20 LTS + Express | Стабильная LTS, быстрый старт |
| **Очередь задач** | BullMQ + Redis 7 | Delayed jobs, retry, переживает рестарт сервера |
| **База данных** | PostgreSQL 16 + Prisma ORM | ACID, JSONB, типобезопасные запросы |
| **Хранилище видео** | Cloudflare R2 | S3-совместимый, нужен для IG/Threads URL-загрузки |
| **Email** | Nodemailer + SMTP (Gmail/Mailgun) | Fallback уведомления если push недоступен |
| **Деплой** | VPS Ubuntu 22 + Docker Compose | Полный контроль, без привязки к платформе |
| **Reverse proxy** | Nginx + Let's Encrypt | SSL, gzip, rate limiting, статика фронтенда |
| **Мониторинг** | Sentry + Uptime Kuma | Ошибки в реальном времени, алерты |
| **CI/CD** | GitHub Actions | Авто-тесты и деплой на push в main |

## 3.2 Сравнение PWA vs Expo (почему PWA выигрывает для этого проекта)

| Критерий | PWA ✅ | Expo (React Native) |
|---|---|---|
| **Стоимость** | Бесплатно | 99$/год Apple Developer |
| **Установка на iPhone** | Safari → Добавить на экран | TestFlight или App Store |
| **Обновления** | Мгновенно (обновил сайт) | OTA или пересборка |
| **Доступ к файлам** | `<input file>` — работает | expo-document-picker |
| **Push-уведомления** | iOS 16.4+ (ограниченно) | APNs — полная поддержка |
| **Разработка** | Обычный веб (любой браузер) | Нужен симулятор/Expo Go |
| **Масштаб до SaaS** | Один URL для всех | Отдельная сборка под iOS |

---

# 4. Архитектура системы

## 4.1 Общая схема

```
┌──────────────────────┐     ┌───────────────────────┐     ┌─────────────────────┐
│   🌐 PWA Frontend    │     │   ⚙️ Node.js Backend   │     │  ☁️ Инфраструктура  │
│   React + Vite       │────▶│   Express API          │────▶│  VPS Ubuntu 22      │
│                      │     │                        │     │                     │
│ • Выбор видео        │     │ • REST endpoints       │     │ • PostgreSQL 16     │
│ • Общий текст        │     │ • OAuth (6 платформ)   │     │ • Redis 7           │
│ • Override по платф. │     │ • BullMQ Scheduler     │     │ • Cloudflare R2     │
│ • Выбор платформ     │     │ • 6 Platform Workers   │     │ • Nginx + SSL       │
│ • Расписание         │     │ • Push + Email service │     │ • Sentry + Uptime   │
│ • История + статусы  │     │                        │     │                     │
└──────────────────────┘     └───────────────────────┘     └─────────────────────┘
```

## 4.2 Структура базы данных

### Таблица: `publications`

| Поле | Тип | Описание |
|---|---|---|
| `id` | UUID PK | ID публикации |
| `user_id` | UUID FK | Владелец |
| `video_r2_key` | VARCHAR | Путь к видео в Cloudflare R2 |
| `default_text` | TEXT | Общий текст/описание для всех платформ |
| `scheduled_at` | TIMESTAMP | Запланированное время публикации (UTC) |
| `status` | ENUM | `draft` \| `scheduled` \| `publishing` \| `published` \| `partial` \| `failed` |
| `platforms` | JSONB | Массив платформ с индивидуальными настройками |
| `metadata` | JSONB | Хэштеги, приватность, pinterest_board_id |

### Структура JSONB поля `platforms`

```json
[
  // YouTube: название + описание
  { "platform": "youtube",   "enabled": true, "title": "Название видео", "text": null },
  // Instagram: только описание
  { "platform": "instagram", "enabled": true, "text": "Свой текст для IG или null = общий" },
  // Threads: автодубль из Instagram, своих полей нет
  { "platform": "threads",   "enabled": true },
  // ВКонтакте: только описание
  { "platform": "vk",        "enabled": true, "text": null },
  // TikTok: только описание
  { "platform": "tiktok",    "enabled": false },
  // Pinterest: название + описание + board
  { "platform": "pinterest", "enabled": true, "title": "Название пина", "text": null, "board_id": "123" }
]
```

---

# 5. Система уведомлений

## 5.1 Три уровня уведомлений

Уведомления реализованы в три уровня — от наилучшего к запасному. Система автоматически определяет, какой уровень доступен для каждого пользователя.

| Приоритет | Тип | Условие | Детали |
|---|---|---|---|
| **1** | PWA Push (браузерный) | iOS 16.4+, добавлено на экран, разрешено | Нативные push через Web Push API + VAPID. Появляются как системные уведомления. |
| **2** | In-App статус | Приложение открыто | Реалтайм-обновление статуса через polling каждые 30 сек. Notification badge на иконке. |
| **3** | Email | Всегда (fallback) | Письмо с результатом. Отправляется если push недоступен или включён в настройках. |

## 5.2 Сценарии уведомлений

- ✅ **Полный успех:** «Опубликовано в YouTube, Instagram, ВКонтакте, Threads» — зелёный статус
- ⚠️ **Частичный успех:** «Опубликовано в 4 из 5. TikTok: ошибка — превышен лимит длины» — жёлтый + Retry
- ❌ **Полная ошибка:** «Публикация не удалась. Причина: ...» — красный + Retry
- ℹ️ **Threads** не показывается отдельно — считается как часть Instagram
- 🔵 **Pinterest** без board_id: «Выберите доску Pinterest» + кнопка исправить

## 5.3 Инструкция по настройке PWA Push на iOS

> ℹ️ **Шаги:** 1) Открыть в Safari. 2) Поделиться → На экран "Домой". 3) Открыть приложение **с экрана** (не из Safari). 4) При появлении запроса — нажать «Разрешить уведомления». Без шага 4 push работать не будет.

---

# 6. Platform Workers — логика публикации

## 6.1 Сводная таблица воркеров

| Платформа | Метод загрузки | Поля и специфика |
|---|---|---|
| **YouTube** | Resumable Upload | Название (обязательно) + Описание. Чанки 5–50 МБ. videoId в ответе. |
| **Instagram** | URL через R2 | Описание (общий или override). R2 URL → container → publish. Форматы: Reels/Feed/Stories. |
| **Threads** | URL через R2 | Описание берётся из Instagram (тот же текст). Отдельного ввода нет. Отдельный API endpoint. |
| **ВКонтакте** | Прямая загрузка | Описание → текст записи на стене. `video.save` → upload → `wall.post`. |
| **TikTok** | Chunk Upload | Описание + хэштеги. Content-Range заголовки. PKCE OAuth. |
| **Pinterest** | Прямая загрузка | Название (обязательно) + Описание + board_id (обязательно). `POST /v5/media` → polling → `POST /v5/pins`. |

## 6.2 Процесс публикации — полная цепочка

| # | Компонент | Действие |
|---|---|---|
| 1 | PWA (браузер) | Пользователь выбирает видео, вводит общий текст, при необходимости override для отдельных платформ |
| 2 | PWA → R2 | Запрашивает presigned URL у бэкенда; загружает видео напрямую в Cloudflare R2 |
| 3 | PWA → API | `POST /publications`: текст, платформы с настройками, pinterest_board_id, scheduled_at (UTC) |
| 4 | Node.js API | Сохраняет в PostgreSQL (status=scheduled), добавляет delayed job в BullMQ |
| 5 | BullMQ | В scheduled_at активирует job, статус → publishing |
| 6 | Publisher Worker | Параллельно запускает воркеры для всех включённых платформ |
| 7a | YouTubeWorker | Берёт title + text; resumable upload; сохраняет videoId + URL |
| 7b | InstagramWorker | Берёт text (или override); R2 URL → создаёт container → публикует |
| 7c | ThreadsWorker | Берёт text из Instagram (тот же); R2 URL → threads container → publish |
| 7d | VKWorker | Берёт text (или override); video.save → прямая загрузка → wall.post |
| 7e | TikTokWorker | Берёт text (или override); chunk upload → video_id |
| 7f | PinterestWorker | Берёт title + text + board_id; прямая загрузка → polling → Video Pin |
| 8 | Result Aggregator | Собирает результаты, определяет: published / partial / failed |
| 9 | Notification Svc | PWA Push (если доступен) + Email (если включён или push недоступен) |
| 10 | PWA (браузер) | Polling или push: обновляет статус публикации, показывает ссылки на видео |

## 6.3 Retry стратегия

- **Попытка 1:** немедленно
- **Попытка 2:** через 5 минут
- **Попытка 3:** через 30 минут
- **Попытка 4:** через 2 часа → статус `failed` → уведомление с причиной

---

# 7. Интерфейс PWA

## 7.1 Экраны приложения

| Экран | URL | Функциональность |
|---|---|---|
| **Dashboard** | `/dashboard` | Следующая публикация, счётчики, список активных задач |
| **Новая публикация** | `/create` | Видео + текст + платформы + время — главный экран |
| **Расписание** | `/schedule` | Календарь с запланированными публикациями |
| **История** | `/history` | Все публикации, фильтры по статусу/платформе, ссылки |
| **Аккаунты** | `/accounts` | Подключённые соцсети, статус токенов, Pinterest boards |
| **Настройки** | `/settings` | Профиль, уведомления (push + email), часовой пояс |
| **Детали** | `/publication/:id` | Статус по каждой платформе, retry, прямые ссылки |
| **OAuth callback** | `/oauth/:platform` | Обработка OAuth redirect после авторизации в соцсети |
| **Установка PWA** | `/install` | Инструкция по установке на iPhone/iPad |

## 7.2 Экран создания публикации — UX Flow

1. Нажать кнопку **«+ Новая публикация»**
2. Выбрать видеофайл — открывается системный picker (Files.app + Фото)
3. Показывается превью видео + размер файла + длительность
4. Ввести общий текст/описание (textarea)
5. Включить нужные платформы тогглами (YouTube, Instagram, Threads, ВК, TikTok, Pinterest)
6. YouTube/Pinterest: автоматически показывается поле **«Название»** (обязательное)
7. Instagram выбран → Threads включается автоматически с пометкой «Дублирует Instagram»
8. Pinterest выбран → показывается dropdown **«Выбрать доску»**
9. Опционально: нажать **«⚙»** рядом с платформой → ввести свой текст для неё
10. Выбрать дату и время публикации (с учётом часового пояса устройства)
11. Нажать **«Запланировать»** → файл загружается → публикация создана

> ℹ️ **Threads** не показывается как самостоятельный тоггл. Он появляется как вложенный пункт под Instagram: «Threads: автоматически дублирует текст из Instagram». Пользователь может его отключить отдельно.

## 7.3 Адаптация под iPhone и iPad

- **iPhone:** одноколоночный layout, bottom navigation bar, большие touch-цели (min 44px)
- **iPad:** двухколоночный layout, sidebar навигация, превью видео рядом с формой
- **Оба:** поддержка Safe Area (notch, Dynamic Island, Home Indicator)
- **Тёмная тема:** автоматически по системным настройкам (`prefers-color-scheme`)

---

# 8. Безопасность

## 8.1 Аутентификация пользователей

- JWT (access token: 15 мин) + Refresh token (30 дней) в `httpOnly` cookie
- При первом запуске: email + password регистрация (для 1-2 пользователей — простейшая схема)
- Refresh token хранится в `httpOnly` cookie — недоступен JavaScript, защита от XSS
- Access token передаётся в `Authorization` header — не хранится в localStorage

## 8.2 OAuth токены платформ — сроки и обновление

| Платформа | Срок токена | Стратегия обновления |
|---|---|---|
| **YouTube** | Access: 1 час / Refresh: бессрочный | Auto-refresh за 5 мин до истечения. Refresh token не истекает если не отозван. |
| **Instagram** | Access: 1 час / Long-lived: 60 дней | Cron каждые 30 дней обновляет long-lived token. При ошибке — push/email пользователю. |
| **Threads** | Те же что Instagram | Переиспользует Meta токены. Отдельного refresh не требует. |
| **ВКонтакте** | 1 год или бессрочный | Практически не требует обновления. Мониторинг `is_active` флага. |
| **TikTok** | Access: 24 ч / Refresh: 365 дней | Auto-refresh за 30 мин до истечения access token. |
| **Pinterest** | Access: 30 дней / Refresh: 1 год | Auto-refresh за 7 дней до истечения. Cron-задача проверки ежедневно. |

> ⚠️ **Instagram** — самый проблемный по токенам. Long-lived токен истекает каждые 60 дней. Настрой cron: за 7 дней до истечения — автоматическое продление. Если не удалось — push + email с просьбой переподключить аккаунт.

## 8.3 Переменные окружения (полный список)

| Переменная | Назначение |
|---|---|
| `DATABASE_URL` | PostgreSQL строка подключения |
| `REDIS_URL` | Redis строка подключения |
| `JWT_SECRET` | Секрет для подписи JWT (32+ случайных символа) |
| `JWT_REFRESH_SECRET` | Секрет для refresh token (другой, 32+ символа) |
| `ENCRYPTION_KEY` | AES-256 ключ для OAuth токенов (32 байта, base64) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push VAPID ключи (генерируются один раз) |
| `SMTP_HOST` / `PORT` / `USER` / `PASS` | SMTP для email уведомлений |
| `R2_ACCOUNT_ID` / `ACCESS_KEY` / `SECRET_KEY` / `BUCKET` | Cloudflare R2 |
| `R2_PUBLIC_URL` | Публичный домен R2 (нужен для Instagram/Threads) |
| `YOUTUBE_CLIENT_ID` / `CLIENT_SECRET` | Google OAuth для YouTube |
| `VK_APP_ID` / `APP_SECRET` | ВКонтакте приложение |
| `META_APP_ID` / `APP_SECRET` | Meta (Instagram + Threads) |
| `TIKTOK_CLIENT_KEY` / `CLIENT_SECRET` | TikTok Developer App |
| `PINTEREST_APP_ID` / `APP_SECRET` | Pinterest Developer App |
| `FRONTEND_URL` | URL фронтенда (для CORS и OAuth callback) |

---

# 9. Деплой

## 9.1 VPS — минимальные требования

| | |
|---|---|
| **CPU** | 2 vCPU |
| **RAM** | 4 ГБ (Node.js + Redis + PostgreSQL) |
| **Диск** | 40 ГБ SSD |
| **ОС** | Ubuntu 22.04 LTS |
| **Рекомендуемые хостинги** | Hetzner CX21 (~5€/мес), Timeweb Cloud (~600 руб/мес), DigitalOcean Droplet |

## 9.2 Docker Compose сервисы

- **nginx** — HTTPS терминация, gzip, отдача статики фронтенда, proxy на API
- **api** — Node.js Express (порт 3000)
- **worker** — BullMQ worker для обработки очереди публикаций
- **postgres** — PostgreSQL 16 с persistent volume
- **redis** — Redis 7 для BullMQ и кэша

## 9.3 Сборка и деплой фронтенда (PWA)

1. `vite build` — создаёт `/dist` с оптимизированными файлами
2. Копируем `/dist` на VPS в `/var/www/videoflow/`
3. Nginx отдаёт статику из этой папки
4. `manifest.json` и Service Worker доступны по HTTPS — обязательно для PWA
5. При обновлении: заново делаем `vite build` и копируем — пользователи получают новую версию автоматически

> ℹ️ PWA Service Worker кэширует файлы. После деплоя обновлённой версии Service Worker обнаружит изменения и предложит пользователю обновить приложение (или обновит автоматически при следующем запуске).

## 9.4 SSL — обязательно для PWA

> ⚠️ PWA работает **ТОЛЬКО** через HTTPS (или localhost для разработки). Без SSL Service Worker и Push уведомления не работают. Let's Encrypt + Certbot — бесплатное решение, автопродление каждые 90 дней.

```bash
# Установить Certbot
sudo apt install certbot python3-certbot-nginx

# Получить сертификат
sudo certbot --nginx -d app.videoflow.io

# Проверить автопродление
sudo certbot renew --dry-run
```

---

# 10. Дорожная карта

## Месяц 1 — MVP: YouTube + ВКонтакте

- **Нед. 1:** Репозиторий, Docker Compose, GitHub Actions CI/CD
- **Нед. 1:** PostgreSQL схема, Prisma, JWT auth, базовый API
- **Нед. 2:** Cloudflare R2: presigned upload, YouTube OAuth + upload, VK OAuth + публикация
- **Нед. 2:** BullMQ: очередь, scheduler, retry логика
- **Нед. 3:** PWA React: форма создания публикации, выбор файла, загрузка в R2
- **Нед. 3:** PWA: история, статус публикации (polling), email уведомления
- **Нед. 4:** Nginx + SSL, деплой на VPS, установка PWA на iPhone — end-to-end тест

## Месяц 2 — Instagram + Threads + TikTok

- Подать заявку в Meta App Review (сразу в начале месяца)
- Instagram Worker: Reels/Feed/Stories, R2 URL flow
- Threads Worker: переиспользование Meta инфраструктуры
- TikTok OAuth + chunk upload worker
- PWA Push уведомления: VAPID ключи, Service Worker, запрос разрешения
- Per-platform текст в UI (кнопка Override)

## Месяц 3–4 — Pinterest + полировка

- Pinterest OAuth, boards API, Video Pin worker
- UI: dropdown выбора досок Pinterest, валидация полей
- Шаблоны публикаций (сохранить набор платформ + время)
- История с фильтрами, прямые ссылки на видео
- Полировка UX: тёмная тема, iPad layout, анимации

## Месяц 5–6 — Команда и SaaS

- Мультипользовательский режим, приглашения, роли
- Биллинг (Stripe через веб)
- Публичный лендинг + документация для пользователей

---

# 11. Риски и решения

| Риск | Платформа | Влияние | Решение |
|---|---|---|---|
| PWA push не работает на iOS < 16.4 | iOS | Среднее | Email fallback + статус в UI. Указать требования в инструкции. |
| Пользователь открывает из Safari, не с экрана | iOS | Среднее | Push не работает без установки. Показывать баннер с инструкцией при каждом входе. |
| Instagram App Review отказ | Instagram | **Высокое** | Development Mode (25 аккаунтов) для теста. Подать заявку сразу. |
| Instagram токен истёк (60 дней) | Instagram | **Высокое** | Cron обновление каждые 30 дней + push/email за 7 дней до истечения. |
| TikTok изменяет API | TikTok | **Высокое** | Изолированный модуль. Fallback: помечать TikTok как failed, остальные публикуются. |
| YouTube квота исчерпана | YouTube | Среднее | 4 видео/день = 6400 ед из 10000. Запросить увеличение квоты заранее. |
| Pinterest без выбора доски | Pinterest | Низкое | UI валидация: нельзя запланировать Pinterest без board_id. |
| Видео слишком большое для платформы | Все | Среднее | Показывать ограничения по размеру/длине при выборе файла в UI. |
| R2 недоступен во время публикации | Instagram/Threads | Среднее | Retry + fallback URL стратегия. Cloudflare SLA 99.9%. |
| Threads — молодой API, нестабилен | Threads | Среднее | Добавить в фазе 2. Изолированный worker с graceful fail. |

---

# 12. Быстрый старт — первые шаги

## 12.1 Что сделать до написания кода

1. **VPS** — арендовать сервер (Hetzner CX21 или Timeweb)
2. **Домен** — купить или взять бесплатный (freenom.com), настроить DNS на IP сервера
3. **Cloudflare** — включить R2, создать bucket, настроить custom domain для публичного URL
4. **Google Cloud Console** — включить YouTube Data API v3, создать OAuth 2.0 Client ID
5. **VK Developers** (vk.com/dev) — создать Standalone приложение
6. **Meta for Developers** — создать приложение, добавить Instagram Basic Display + Threads API
7. **TikTok for Developers** — зарегистрироваться, пройти верификацию разработчика
8. **Pinterest Developers** — создать приложение, запросить scope `pins:write` + `boards:read`
9. **Gmail или Mailgun** — настроить SMTP для email уведомлений

## 12.2 Порядок разработки

> ℹ️ **Золотое правило:** каждый шаг должен работать и быть протестирован перед следующим. Не пытайся подключить все 6 платформ сразу.

1. Бэкенд: auth + БД + presigned upload в R2
2. ВКонтакте: OAuth + публикация (тест через Postman)
3. BullMQ: очередь + scheduler + retry
4. PWA фронтенд: форма создания + загрузка файла + статус
5. Nginx + SSL на VPS + установка PWA на iPhone — первый полный тест
6. Email уведомления
7. YouTube OAuth + resumable upload
8. PWA Push уведомления (VAPID)
9. Instagram: Reels → Feed → Stories
10. Threads (на базе Instagram)
11. TikTok OAuth + chunk upload
12. Pinterest: OAuth + boards + Video Pin

## 12.3 Структура репозитория

| Папка | Содержимое |
|---|---|
| `/frontend` | React + Vite PWA приложение (`src/`, `public/manifest.json`, `sw.js`) |
| `/backend` | Node.js Express API + Platform Workers |
| `/backend/workers` | Отдельный файл на каждую платформу: `youtube.js`, `vk.js`, `instagram.js`... |
| `/backend/services` | `notificationService.js`, `uploadService.js`, `oauthService.js` |
| `/infrastructure` | `docker-compose.yml`, `nginx.conf`, GitHub Actions workflows |
| `/docs` | Документация, Architecture Decision Records, API reference |

---

*© 2026 VideoFlow · Порядок разработки: ВК → YouTube → IG → Threads → TikTok → Pinterest*
