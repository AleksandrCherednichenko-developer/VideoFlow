# Current Sprint

## Goal

Сделать существующий OAuth flow безопасной базой для дальнейших P0-интеграций:
исключить секреты из persisted metadata и HTTP access logs без изменения
публичного account API.

## Active task

[TASK-001: Security baseline](tasks/TASK-001-security-baseline.md)

- Status: Ready
- Priority: Critical
- Expected size: 2–5 working days
- Depends on: current auth/OAuth tests and migration baseline

## Definition of Done

- OAuth token/code/state отсутствуют в новых metadata и request logs.
- Существующие небезопасные metadata очищаются migration.
- Public auth/account responses остаются совместимыми.
- Новые security tests и все существующие проверки проходят.
- CHANGES и закрытые warnings/debt обновлены.

## Known risks

- JSON metadata может содержать provider-specific формы секретов, поэтому
  migration должна заменять объект целиком, а не удалять несколько известных keys.
- Access logger должен сохранить полезные method/status/timing данные.
- Production migration требует backup и выборочной проверки до deploy.

## Next candidate

После завершения TASK-001 следующий кандидат определяется из
[BACKLOG](BACKLOG.md): `TASK-002 YouTube feasibility evidence`.
