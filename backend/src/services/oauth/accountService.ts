import {
  Platform as PrismaPlatform,
  type Prisma,
  type PlatformAccount,
} from "@prisma/client";

import { AppError } from "../../api/errors/AppError.js";
import { PLATFORM, type Platform } from "../../config/constants.js";
import { prisma } from "../../db/prisma.js";
import { decryptSecret, encryptSecret } from "../security/encryptionService.js";
import {
  getOAuthProvider,
  type OAuthAccountProfile,
  type OAuthTokens,
} from "./oauthProviders.js";
import { createOAuthState, verifyOAuthState } from "./oauthState.js";

const PRISMA_PLATFORM_BY_API_PLATFORM = {
  [PLATFORM.YOUTUBE]: PrismaPlatform.YOUTUBE,
  [PLATFORM.VK]: PrismaPlatform.VK,
  [PLATFORM.INSTAGRAM]: PrismaPlatform.INSTAGRAM,
  [PLATFORM.TIKTOK]: PrismaPlatform.TIKTOK,
  [PLATFORM.PINTEREST]: PrismaPlatform.PINTEREST,
} as const satisfies Record<Platform, PrismaPlatform>;

const API_PLATFORM_BY_PRISMA_PLATFORM = {
  [PrismaPlatform.YOUTUBE]: PLATFORM.YOUTUBE,
  [PrismaPlatform.VK]: PLATFORM.VK,
  [PrismaPlatform.INSTAGRAM]: PLATFORM.INSTAGRAM,
  [PrismaPlatform.TIKTOK]: PLATFORM.TIKTOK,
  [PrismaPlatform.PINTEREST]: PLATFORM.PINTEREST,
} as const satisfies Record<PrismaPlatform, Platform>;

export interface AccountResponse {
  id: string;
  platform: Platform;
  externalAccountId: string | null;
  externalAccountName: string | null;
  expiresAt: string | null;
  isExpired: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StartOAuthResult {
  authorizationUrl: string;
}

export interface PlatformAccountSecret {
  accessToken: string;
  externalAccountId: string | null;
  metadata: unknown;
  expiresAt: Date | null;
}

function serializeAccount(account: PlatformAccount): AccountResponse {
  return {
    id: account.id,
    platform: API_PLATFORM_BY_PRISMA_PLATFORM[account.platform],
    externalAccountId: account.externalAccountId,
    externalAccountName: account.externalAccountName,
    expiresAt: account.expiresAt?.toISOString() ?? null,
    isExpired:
      account.expiresAt !== null && account.expiresAt.getTime() <= Date.now(),
    isActive: account.isActive,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

function buildAccountMetadata(
  platform: Platform,
  profile: OAuthAccountProfile,
): Prisma.InputJsonObject {
  const profileMetadata: Prisma.InputJsonObject = {
    ...(profile.externalAccountId !== undefined
      ? { externalAccountId: profile.externalAccountId }
      : {}),
    ...(profile.externalAccountName !== undefined
      ? { externalAccountName: profile.externalAccountName }
      : {}),
  };

  return {
    provider: platform,
    ...(Object.keys(profileMetadata).length > 0
      ? { profile: profileMetadata }
      : {}),
  };
}

function buildRefreshTokenData(
  refreshToken: string | undefined,
): Pick<Prisma.PlatformAccountCreateInput, "refreshTokenEncrypted"> {
  return {
    refreshTokenEncrypted:
      refreshToken === undefined ? null : encryptSecret(refreshToken),
  };
}

export function startOAuth(
  userId: string,
  platform: Platform,
): StartOAuthResult {
  const provider = getOAuthProvider(platform);

  if (!provider.isConfigured()) {
    throw new AppError(
      503,
      "OAuthProviderNotConfigured",
      `${provider.displayName} OAuth is not configured`,
    );
  }

  const state = createOAuthState(userId, platform);

  return {
    authorizationUrl: provider.buildAuthorizationUrl(state),
  };
}

export async function completeOAuthCallback(
  platform: Platform,
  code: string,
  state: string,
): Promise<AccountResponse> {
  const provider = getOAuthProvider(platform);
  const payload = verifyOAuthState(state, platform);
  const tokens = await provider.exchangeCode(code);
  const profile = await provider.fetchAccountProfile(tokens);
  const prismaPlatform = PRISMA_PLATFORM_BY_API_PLATFORM[platform];
  const account = await prisma.platformAccount.upsert({
    where: {
      userId_platform: {
        userId: payload.userId,
        platform: prismaPlatform,
      },
    },
    create: {
      userId: payload.userId,
      platform: prismaPlatform,
      externalAccountId: profile.externalAccountId ?? null,
      externalAccountName: profile.externalAccountName ?? null,
      accessTokenEncrypted: encryptSecret(tokens.accessToken),
      ...buildRefreshTokenData(tokens.refreshToken),
      expiresAt: tokens.expiresAt ?? null,
      metadata: buildAccountMetadata(platform, profile),
      isActive: true,
    },
    update: {
      externalAccountId: profile.externalAccountId ?? null,
      externalAccountName: profile.externalAccountName ?? null,
      accessTokenEncrypted: encryptSecret(tokens.accessToken),
      ...(tokens.refreshToken !== undefined
        ? { refreshTokenEncrypted: encryptSecret(tokens.refreshToken) }
        : {}),
      expiresAt: tokens.expiresAt ?? null,
      metadata: buildAccountMetadata(platform, profile),
      isActive: true,
    },
  });

  return serializeAccount(account);
}

export async function listAccounts(userId: string): Promise<AccountResponse[]> {
  const accounts = await prisma.platformAccount.findMany({
    where: {
      userId,
    },
    orderBy: {
      platform: "asc",
    },
  });

  return accounts.map(serializeAccount);
}

export async function disconnectAccount(
  userId: string,
  platform: Platform,
): Promise<void> {
  await prisma.platformAccount.deleteMany({
    where: {
      userId,
      platform: PRISMA_PLATFORM_BY_API_PLATFORM[platform],
    },
  });
}

export async function getActivePlatformAccountSecret(
  userId: string,
  platform: Platform,
): Promise<PlatformAccountSecret> {
  const account = await prisma.platformAccount.findUnique({
    where: {
      userId_platform: {
        userId,
        platform: PRISMA_PLATFORM_BY_API_PLATFORM[platform],
      },
    },
  });

  if (account === null) {
    throw new AppError(
      404,
      "PlatformAccountNotConnected",
      "Platform account is not connected",
    );
  }

  if (!account.isActive) {
    throw new AppError(
      409,
      "PlatformAccountInactive",
      "Platform account is inactive",
    );
  }

  if (account.expiresAt !== null && account.expiresAt.getTime() <= Date.now()) {
    throw new AppError(
      409,
      "PlatformAccountExpired",
      "Platform account token expired",
    );
  }

  return {
    accessToken: decryptSecret(account.accessTokenEncrypted),
    externalAccountId: account.externalAccountId,
    metadata: account.metadata,
    expiresAt: account.expiresAt,
  };
}
