DELETE FROM "publication_results" WHERE "platform"::text = 'threads';
DELETE FROM "platform_accounts" WHERE "platform"::text = 'threads';

UPDATE "publications"
SET "platforms" = COALESCE(
  (
    SELECT jsonb_agg(item)
    FROM jsonb_array_elements("platforms") AS item
    WHERE item->>'platform' <> 'threads'
  ),
  '[]'::jsonb
)
WHERE "platforms" @> '[{"platform":"threads"}]'::jsonb;

ALTER TYPE "Platform" RENAME TO "Platform_old";
CREATE TYPE "Platform" AS ENUM ('youtube', 'vk', 'instagram', 'tiktok', 'pinterest');

ALTER TABLE "platform_accounts"
  ALTER COLUMN "platform" TYPE "Platform"
  USING "platform"::text::"Platform";

ALTER TABLE "publication_results"
  ALTER COLUMN "platform" TYPE "Platform"
  USING "platform"::text::"Platform";

DROP TYPE "Platform_old";

ALTER TABLE "users" DROP COLUMN "email_notifications_enabled";
