-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('draft', 'scheduled', 'publishing', 'published', 'partial', 'failed');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('youtube', 'vk', 'instagram', 'threads', 'tiktok', 'pinterest');

-- CreateEnum
CREATE TYPE "PlatformResultStatus" AS ENUM ('pending', 'publishing', 'published', 'failed', 'skipped');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "email_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "video_r2_key" TEXT NOT NULL,
    "default_text" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'scheduled',
    "platforms" JSONB NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "platform" "Platform" NOT NULL,
    "external_account_id" TEXT,
    "external_account_name" TEXT,
    "access_token_encrypted" TEXT NOT NULL,
    "refresh_token_encrypted" TEXT,
    "expires_at" TIMESTAMP(3),
    "metadata" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_results" (
    "id" UUID NOT NULL,
    "publication_id" UUID NOT NULL,
    "platform" "Platform" NOT NULL,
    "status" "PlatformResultStatus" NOT NULL DEFAULT 'pending',
    "external_id" TEXT,
    "result_url" TEXT,
    "error_code" TEXT,
    "error_message" TEXT,
    "raw_response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publication_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "publications_user_id_scheduled_at_idx" ON "publications"("user_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "publications_status_scheduled_at_idx" ON "publications"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "platform_accounts_platform_is_active_idx" ON "platform_accounts"("platform", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "platform_accounts_user_id_platform_key" ON "platform_accounts"("user_id", "platform");

-- CreateIndex
CREATE INDEX "publication_results_status_idx" ON "publication_results"("status");

-- CreateIndex
CREATE UNIQUE INDEX "publication_results_publication_id_platform_key" ON "publication_results"("publication_id", "platform");

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_accounts" ADD CONSTRAINT "platform_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_results" ADD CONSTRAINT "publication_results_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
