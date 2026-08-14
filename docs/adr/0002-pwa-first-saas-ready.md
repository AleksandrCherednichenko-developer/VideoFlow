# ADR 0002: PWA-first and SaaS-ready product direction

## Status

Accepted.

## Date

27 July 2026.

## Context

The customer brief DiPost v1.0 describes a native iOS application for one creator,
with Instagram, TikTok and YouTube in MVP. The existing VideoFlow project already
contains a working React PWA, backend API, R2 upload flow, durable scheduler and
publication worker.

The brief is an important source of user needs, but its implementation choices are
not immutable. The product is also expected to evolve into a monetizable SaaS.

The previous VK-first direction is blocked by platform API constraints and must not
drive the new MVP.

## Decision

1. Keep React/Vite PWA as the primary client for the next product stages.
2. Keep server-side scheduling and publishing as the core architecture.
3. Evolve the Node.js backend into a modular monolith with a separate worker
   process.
4. Isolate social networks behind capability-aware Ports & Adapters.
5. Treat Instagram, TikTok and YouTube as candidate MVP platforms, conditional on
   real official-API feasibility gates.
6. Move VK to a later phase until an acceptable official publishing flow exists.
7. Introduce workspace ownership as the future tenant boundary before implementing
   organizations and billing.
8. Keep native iOS as an evidence-based future option using the same backend API.
9. Do not introduce microservices before scaling or team boundaries justify them.

## Options considered

### Rewrite as native SwiftUI now

Advantages:

- strongest iOS UX;
- Keychain, APNs, Photos and background task integration;
- App Store distribution.

Rejected for the current stage because it discards a usable PWA, delays API
validation and does not reduce the main platform-integration risks.

### React Native or Expo

Advantages:

- native packaging with TypeScript/React experience;
- possible iOS and Android expansion.

Rejected for now because Android is not a near-term need and the existing web
client still provides the fastest validation path.

### Continue current PWA without architecture changes

Advantages:

- minimum immediate work.

Rejected because user-owned data, JSONB platform settings and direct service
coupling will make SaaS isolation, analytics and platform evolution harder.

### Microservices

Rejected because the current team, traffic and domain maturity do not justify
distributed operational complexity.

## Consequences

Positive:

- existing investment remains useful;
- creator workflow can be validated sooner;
- backend is reusable by web and possible native clients;
- SaaS capabilities have explicit boundaries;
- platform API failures remain isolated.

Negative:

- PWA has weaker iOS integration than native;
- Web Push requires installation and supported iOS;
- offline media is constrained;
- modular boundaries require deliberate refactoring;
- platform availability remains dependent on external review and audit.

## Revisit triggers

Reconsider the client decision when:

- PWA upload reliability is insufficient;
- push limitations measurably hurt retention;
- App Store distribution becomes commercially important;
- native-only features become critical.

Reconsider service extraction when:

- platform workers need materially different scaling;
- independent teams own deployments;
- a platform requires a distinct runtime or security boundary.

