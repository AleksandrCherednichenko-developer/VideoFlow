# VK Experimental Integration Manual Check

## Status

Historical/experimental. VK is not part of the current creator MVP.

The original VK OAuth flow is no longer considered valid. The current worktree
experiments with a manually supplied community access token and a wall post that
contains a link to the R2 video. This is not equivalent to native VK Clips upload.

See:

- [Product Requirements](product-requirements.md)
- [Platform Feasibility Gates](platform-feasibility.md)
- [Roadmap](roadmap.md)

## Safety

- Use only a dedicated test community.
- Never commit a community token.
- Never include the token in CLI arguments or logs.
- Verify that R2 media exposure matches the intended privacy.
- Do not present a successful link post as proof of Clips API availability.

## Prerequisites

- PostgreSQL and Redis are running.
- Backend, frontend and worker use the same environment.
- R2 is configured.
- A VideoFlow test user exists.
- The test community ID and community access token are available.

## Start services

```bash
docker compose -f infrastructure/docker-compose.yml up -d postgres redis
pnpm --filter @videoflow/backend dev
pnpm --filter @videoflow/backend worker:dev
pnpm --filter @videoflow/frontend dev
```

## Connect the test community

1. Sign in to VideoFlow.
2. Open `/accounts`.
3. In the VK card, enter the numeric community ID and community access token.
4. Submit the form.
5. Verify that the account is active and the community name is shown.

## Schedule an experimental publication

Use the PWA or the existing local script with a previously uploaded R2 object:

```bash
pnpm --filter @videoflow/backend vk:create-test-publication \
  --email test@example.com \
  --video-r2-key users/<user-id>/uploads/clip.mp4 \
  --delay-seconds 30 \
  --text "VideoFlow VK experimental link post"
```

## Verify

```bash
pnpm --filter @videoflow/backend vk:status test@example.com
```

Expected for the experimental flow:

- publication finishes without blocking the queue;
- VK result contains `externalId` and wall `resultUrl`;
- the wall post contains the intended text and R2 link;
- no community token appears in logs or persisted raw responses.

This check does not close a VK Clips feasibility gate.
