import { Platform as PrismaPlatform } from "@prisma/client";

import { prisma } from "../db/prisma.js";

function readEmailArg(): string {
  const email = process.argv[2]?.trim();

  if (email === undefined || email.length === 0) {
    throw new Error("Usage: pnpm --filter @videoflow/backend vk:status <email>");
  }

  return email.toLowerCase();
}

async function main(): Promise<void> {
  const email = readEmailArg();
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      platformAccounts: {
        where: {
          platform: PrismaPlatform.VK,
        },
      },
      publications: {
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
        include: {
          results: true,
        },
      },
    },
  });

  if (user === null) {
    throw new Error(`User not found for email ${email}`);
  }

  const vkAccount = user.platformAccounts[0] ?? null;
  const recentVkPublications = user.publications
    .map((publication) => ({
      id: publication.id,
      scheduledAt: publication.scheduledAt.toISOString(),
      status: publication.status,
      videoR2Key: publication.videoR2Key,
      results: publication.results
        .filter((result) => result.platform === PrismaPlatform.VK)
        .map((result) => ({
          id: result.id,
          status: result.status,
          externalId: result.externalId,
          resultUrl: result.resultUrl,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          updatedAt: result.updatedAt.toISOString(),
        })),
    }))
    .filter((publication) => publication.results.length > 0);

  console.log(
    JSON.stringify(
      {
        user: {
          id: user.id,
          email: user.email,
          timezone: user.timezone,
        },
        vkAccount:
          vkAccount === null
            ? null
            : {
                id: vkAccount.id,
                externalAccountId: vkAccount.externalAccountId,
                externalAccountName: vkAccount.externalAccountName,
                expiresAt: vkAccount.expiresAt?.toISOString() ?? null,
                isActive: vkAccount.isActive,
                hasAccessToken: vkAccount.accessTokenEncrypted.length > 0,
                hasRefreshToken:
                  vkAccount.refreshTokenEncrypted !== null &&
                  vkAccount.refreshTokenEncrypted.length > 0,
                updatedAt: vkAccount.updatedAt.toISOString(),
              },
        recentVkPublications,
      },
      null,
      2,
    ),
  );
}

void main()
  .catch(async (error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "VK status check failed",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
