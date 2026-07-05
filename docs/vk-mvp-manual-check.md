# VK MVP Manual Check

This runbook is for the first live VK OAuth and publish verification for WBS 9.

## Prerequisites

- `VK_APP_ID`, `VK_APP_SECRET`, and `VK_REDIRECT_URL` are set in `.env`.
- The VK app uses the same redirect URL as the backend callback:
  `http://localhost:3000/oauth/vk/callback`
- PostgreSQL and Redis are running locally.
- A test user exists in VideoFlow.
- A video has already been uploaded to R2 and you know its `videoR2Key`.

## Start local services

```bash
docker compose -f infrastructure/docker-compose.yml up -d postgres redis
pnpm --filter @videoflow/backend dev
pnpm --filter @videoflow/backend worker:dev
pnpm --filter @videoflow/frontend dev
```

## Connect a VK account

1. Open the frontend and sign in with the test user.
2. Go to `/accounts`.
3. Click `Connect` in the VK card.
4. Complete the VK authorization flow.
5. Wait for the browser to return to `/accounts?oauth=connected&platform=vk`.

## Verify the connected account

Run:

```bash
pnpm --filter @videoflow/backend vk:status test@example.com
```

Successful VK OAuth should show:

- `vkAccount` is not `null`
- `isActive` is `true`
- `hasAccessToken` is `true`
- `externalAccountId` is present

## Create a VK test publication

Run:

```bash
pnpm --filter @videoflow/backend vk:create-test-publication \
  --email test@example.com \
  --video-r2-key users/<user-id>/uploads/clip.mp4 \
  --delay-seconds 30 \
  --text "VideoFlow VK manual smoke check"
```

This schedules a VK-only publication using an existing uploaded video.

## Verify publish result

1. Wait for the worker to pick up the job.
2. Re-run:

```bash
pnpm --filter @videoflow/backend vk:status test@example.com
```

Successful publish should show a recent publication with:

- publication `status = published` or `partial`
- a VK result row in `results`
- `externalId`
- `resultUrl`

If the publication fails, inspect:

- backend API logs
- worker logs
- `errorCode` and `errorMessage` in the VK result row from `vk:status`

## Done criteria for WBS 9

- VK account connects through OAuth
- VK account is stored in `PlatformAccount`
- Worker publishes video to VK
- `PublicationResult` contains `externalId`, `resultUrl`, and raw result metadata
