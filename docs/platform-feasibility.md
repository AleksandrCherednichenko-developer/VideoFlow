# Platform Feasibility Gates

**Последняя актуализация:** 15 августа 2026

Этот документ предотвращает реализацию интеграции на основании устаревшего или
неполного представления об API. Сведения об API меняются; перед каждым gate
проверяется актуальная официальная документация.

## Общий gate

Платформа считается доступной для MVP только если подтверждены:

- официальный publishing API для нужного формата;
- допустимый тип аккаунта заказчика;
- developer app и redirect URLs;
- необходимые OAuth scopes;
- возможность получить/обновить token server-side;
- публичная, а не только private/test публикация;
- автоматическая или отложенная публикация не нарушает правила API;
- media transfer с R2 или server upload;
- final status, external ID и URL;
- quota для ожидаемого объёма;
- review/audit процесс и реалистичный срок;
- доступные analytics;
- live publish на тестовом аккаунте.

Результат gate: `supported`, `supported_with_limits`, `blocked` или
`requires_review`.

## Instagram Reels

### Рабочая гипотеза

- Professional Creator/Business account;
- Reels publishing через Instagram API;
- media container получает доступный video URL из R2;
- backend проверяет container status и выполняет publish;
- analytics зависят от permissions и доступных insights.

### Gate checklist

- [ ] Уточнить Facebook Login или Instagram Login flow.
- [ ] Подтвердить требования к linked Facebook Page для выбранного flow.
- [ ] Создать Meta app и test roles.
- [ ] Получить publishing и insights permissions.
- [ ] Подключить реальный professional account.
- [ ] Опубликовать Reel из R2.
- [ ] Проверить processing polling и ошибки container.
- [ ] Получить permalink и доступные metrics.
- [ ] Зафиксировать App Review requirements.

Official starting point:
<https://developers.facebook.com/docs/instagram-platform/content-publishing/>

## TikTok

### Рабочая гипотеза

TikTok — интеграция с самым высоким release risk:

- требуется Content Posting API;
- scope `video.publish` должен быть одобрен;
- unaudited client может публиковать только с ограниченной visibility;
- posting UX должен соответствовать требованиям TikTok;
- `PULL_FROM_URL` требует подтверждённого домена.

### Gate checklist

- [ ] Создать TikTok developer app.
- [ ] Подтвердить eligibility аккаунта заказчика.
- [ ] Получить Login Kit и `video.publish`.
- [ ] Реализовать Query Creator Info в обязательном UX.
- [ ] Проверить explicit-consent требования для scheduled flow.
- [ ] Подтвердить домен R2 для `PULL_FROM_URL` либо проверить file upload.
- [ ] Выполнить private test publish.
- [ ] Описать audit path для public visibility.
- [ ] Проверить publish status polling/webhook.
- [ ] Проверить доступные metrics и daily posting caps.

Official starting points:

- <https://developers.tiktok.com/doc/content-posting-api-get-started/>
- <https://developers.tiktok.com/doc/content-posting-api-reference-direct-post/>
- <https://developers.tiktok.com/doc/content-sharing-guidelines/>

## YouTube Shorts

### Рабочая гипотеза

- OAuth 2.0 server-side flow;
- `youtube.upload` scope;
- resumable `videos.insert`;
- title и description передаются из publication target;
- Shorts определяется YouTube по параметрам контента, а не отдельным upload API;
- processing status проверяется после загрузки.

Официальные ограничения, требующие live-подтверждения в TASK-002:

- unverified API projects принудительно ограничивают uploads режимом `private`;
- OAuth consent в статусе Testing ограничивает test-user authorization и refresh
  token семью днями;
- upload UI обязан дать пользователю title, description и выбор
  public/private/unlisted;
- API limit title — 100 символов, description — 5000 bytes;
- актуальная документация выделяет 100 `videos.insert` calls/day и стоимость один
  unit в отдельном Video Uploads quota bucket; фактический Console limit важнее
  документационного default;
- продукт сохраняет более строгое ограничение 9:16 и 60 секунд, хотя текущие
  правила YouTube допускают более длинные Shorts.

### Gate checklist

- [ ] Создать Google Cloud project.
- [ ] Включить YouTube Data API v3.
- [ ] Настроить OAuth consent screen и redirect URL.
- [ ] Проверить refresh token lifecycle.
- [ ] Выполнить resumable upload.
- [ ] Проверить status query и продолжение interrupted upload session.
- [ ] Проверить public/unlisted visibility.
- [ ] Зафиксировать OAuth verification и API audit requirements.
- [ ] Проверить quota на ожидаемый объём.
- [ ] Получить video URL и processing status.
- [ ] Получить доступные statistics.
- [ ] Проверить required minimum functionality и audience/Made for Kids decision.
- [ ] Зафиксировать решение `supported`, `supported_with_limits`, `blocked` или
      `requires_review` в sanitized gate report.

Official starting points:

- <https://developers.google.com/youtube/v3/guides/uploading_a_video>
- <https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol>
- <https://developers.google.com/youtube/v3/docs/videos>
- <https://developers.google.com/youtube/v3/docs/videos/insert>
- <https://developers.google.com/youtube/v3/docs/videos/list>
- <https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps>
- <https://developers.google.com/youtube/terms/required-minimum-functionality>

## VK

### Текущее решение

Интеграция исключена из ближайшего MVP. Ранее существовавший
community-token/link-post flow удалён из текущего кода вместе с исторической
экспериментальной реализацией. Поддерживаемого VK publisher сейчас нет.

Возврат в roadmap возможен после подтверждения официального video/Clips API,
доступных permissions и live publish.

## Gate report template

```md
Platform:
Date:
Developer app:
Test account:
Required scopes:
Review/audit status:
Publish mode:
Public visibility:
Media transfer:
Rate/quota limits:
Analytics:
Known restrictions:
Live test evidence:
Decision:
Recheck date:
```
