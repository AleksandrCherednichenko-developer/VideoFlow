# ADR 0001: PWA для первой реализации DiPost

## Status

Accepted.

## Date

14 August 2026.

## Context

Утверждённое ТЗ DiPost v1.0 требует продукт для iPhone и iPad. В репозитории уже
существует React/Vite PWA и server-side publishing foundation.

## Decision

1. Использовать responsive PWA как единственный клиент первой реализации.
2. Сохранить функциональные требования DiPost v1.0.
3. Использовать Web Push вместо APNs.
4. Хранить сессию через secure httpOnly refresh-cookie, а social tokens — только
   зашифрованными на backend.
5. Выполнять schedule и publishing отдельным server-side worker.
6. MVP-платформы: Instagram, TikTok и YouTube.
7. VK и Pinterest относятся к этапу 2; link-post не считается VK Clips.
8. Не проектировать SaaS, teams, workspaces, billing или native client без нового
   утверждённого требования.

## Consequences

- приложение доступно на iPhone и iPad без App Store;
- публикация не зависит от состояния PWA;
- offline и push используют возможности iOS PWA;
- native-only API не входят в первую реализацию;
- backend остаётся модульным монолитом с отдельным worker.
