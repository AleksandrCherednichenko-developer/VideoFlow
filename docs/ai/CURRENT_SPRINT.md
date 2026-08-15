# Current Sprint

## Goal

Получить подтверждённое официальными документами и live test решение о
пригодности YouTube Data API для server-side scheduled Shorts publishing до
разработки production publisher.

## Active task

[TASK-002: YouTube feasibility evidence](tasks/TASK-002-youtube-feasibility-evidence.md)

- Status: In progress
- Priority: Critical
- Expected size: 2–5 working days
- Depends on: completed TASK-001, owner-provided Google project/test account

## Definition of Done

- Current OAuth подключает реальный test channel и refresh token проверен.
- Разрешённый владельцем private fixture загружен resumable flow.
- Processing, effective privacy, URL, quota и statistics подтверждены evidence.
- OAuth verification, API audit и mandatory upload UX ограничения зафиксированы.
- Gate имеет одно решение и явные requirements/blockers для TASK-003.
- Credentials и raw provider responses отсутствуют в repository и logs.

## Known risks

- Без Google project, test account и разрешения на live upload задача становится
  `Blocked`; mock upload не является evidence.
- OAuth consent в статусе Testing ограничивает test-user authorization семью днями.
- Unverified API project может принудительно оставить upload private до audit.
- Текущий VideoFlow не даёт выбрать privacy и разрешает title длиннее YouTube limit.
- Удаление созданного test video требует отдельного разрешения владельца.

## Next candidate

Если gate даст `supported` или `supported_with_limits`, следующий кандидат —
`TASK-003 YouTube resumable publisher`. При `blocked` или `requires_review`
сначала закрывается указанный внешний blocker.
