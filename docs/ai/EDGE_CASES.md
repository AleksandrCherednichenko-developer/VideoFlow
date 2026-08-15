# Edge Cases

Этот список обязателен при подготовке TASK и тестов. В конкретную задачу
переносятся только релевантные разделы.

## Authentication and sessions

- duplicate email с разным регистром;
- неверный пароль и rate limit;
- отсутствующий, expired, revoked или повторно использованный refresh token;
- два параллельных refresh запроса;
- logout без cookie и logout после expiry;
- cross-site frontend/backend и корректные `secure`/`sameSite` cookies;
- access token истёк во время upload или повторного API-запроса;
- OAuth callback без code/state, с provider error, tampered или expired state;
- OAuth code/state/token не попадают в URL access log и persisted metadata.

## Platform accounts

- аккаунт не подключён, disabled, expired или revoked;
- provider не вернул refresh token при reconnect;
- reconnect не должен потерять существующий refresh token без причины;
- токен истёк между schedule и фактическим publish;
- подключается второй account той же платформы;
- provider profile частичный или не содержит external ID/name;
- platform присутствует в enum/UI, но publisher ещё не реализован.

## Media upload

- пустой файл, неподдерживаемый MIME, нулевой или превышенный размер;
- расширение не соответствует MIME;
- duration больше 60 секунд или недоступна;
- aspect ratio не 9:16, rotation metadata меняет width/height;
- mobile Safari прервал upload или повторно отправил complete;
- R2 key принадлежит другому пользователю или содержит path traversal;
- presigned URL истёк;
- object отсутствует, size/content type после upload отличаются от заявленных;
- cover отсутствует или не поддерживается выбранной платформой.

## Drafts and forms

- draft без video, schedule или enabled platform;
- один platform description пуст, остальные заполнены;
- пользователь отключил платформу после заполнения override;
- повторное использование уже загруженного media;
- локальный offline draft конфликтует с серверной версией;
- browser storage quota exceeded или IndexedDB недоступен;
- закрытие PWA во время upload/create flow.

## Scheduling

- прошлое время, текущая минута и DST boundary `Europe/Moscow`;
- устройство находится во Вьетнаме, но UI должен явно показывать московское время;
- reschedule одновременно с началом worker processing;
- cancel после получения job, но до внешнего API call;
- duplicate schedule command или повтор HTTP-запроса;
- stale BullMQ job после reschedule;
- API сохранил Publication, но queue add завершился ошибкой, и наоборот;
- worker/API/Redis restart до наступления времени.

## Publishing and retries

- одна платформа успешна, другая permanent/transient failure;
- timeout после внешнего вызова с неизвестным фактическим результатом;
- provider не поддерживает idempotency key;
- duplicate job delivery и два worker на одну Publication;
- rate limit, quota exhaustion, moderation rejection и invalid media;
- processing продолжается после upload, final status ещё не доступен;
- retry должен повторять только failed target;
- automatic retry исчерпан, затем запрошен manual retry;
- provider response содержит token или персональные данные;
- platform adapter отсутствует: schedule не должен создавать ложное ожидание
  успешной публикации.

## Notifications

- PWA не установлена или permission denied;
- push subscription expired/invalid;
- уведомление повторилось после retry;
- notification delivery failed после успешного publish;
- account reconnect event дедуплицируется;
- приложение открыто и статус уже обновлён через polling.

## History and analytics

- метрика не поддерживается: `not_supported`, а не `0`;
- provider возвращает частичные или запаздывающие metrics;
- удалённый/скрытый пост;
- quota не позволяет обновлять все publications;
- analytics failure не меняет publish status;
- video уже удалено retention worker, но metadata и result URL сохраняются.

## Retention

- семь дней считаются от завершения публикации, включая partial/failed policy;
- повторное удаление R2 object безопасно;
- object уже отсутствует;
- delete R2 succeeded, database update failed, и наоборот;
- scheduled/draft media не удаляется преждевременно;
- retry после удаления исходного видео запрещён или требует понятного результата.

## UI and mobile

- empty/loading/error/partial states на каждом экране;
- long filename, description, platform error и external ID;
- iPhone portrait, iPad portrait/landscape, safe areas и экранная клавиатура;
- dark mode contrast и platform black color TikTok;
- touch drag-and-drop отменён, пересекает дни или работает со screen reader;
- offline shell открывается после новой версии deployment без stale asset errors.
