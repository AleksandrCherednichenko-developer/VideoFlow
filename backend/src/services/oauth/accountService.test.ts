import { Platform as PrismaPlatform } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  platformAccount: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

const providerMocks = vi.hoisted(() => ({
  isConfigured: vi.fn(),
  buildAuthorizationUrl: vi.fn(),
  exchangeCode: vi.fn(),
  fetchAccountProfile: vi.fn(),
}));

vi.mock("../../db/prisma.js", () => ({
  prisma: prismaMocks,
}));

vi.mock("../security/encryptionService.js", () => ({
  decryptSecret: (value: string) => `decrypted:${value}`,
  encryptSecret: (value: string) => `encrypted:${value}`,
}));

vi.mock("./oauthState.js", () => ({
  createOAuthState: vi.fn(() => "signed-state"),
  verifyOAuthState: vi.fn(() => ({
    userId: "11111111-1111-4111-8111-111111111111",
    platform: "youtube",
    nonce: "nonce",
    expiresAt: "2026-06-30T10:10:00.000Z",
  })),
}));

vi.mock("./oauthProviders.js", () => ({
  getOAuthProvider: vi.fn(() => ({
    platform: "youtube",
    displayName: "YouTube",
    isConfigured: providerMocks.isConfigured,
    buildAuthorizationUrl: providerMocks.buildAuthorizationUrl,
    exchangeCode: providerMocks.exchangeCode,
    fetchAccountProfile: providerMocks.fetchAccountProfile,
  })),
}));

import { PLATFORM } from "../../config/constants.js";
import {
  completeOAuthCallback,
  disconnectAccount,
  getActivePlatformAccountSecret,
  listAccounts,
  startOAuth,
} from "./accountService.js";

const userId = "11111111-1111-4111-8111-111111111111";
const now = new Date("2026-06-30T10:00:00.000Z");

function buildAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: "account-id",
    userId,
    platform: PrismaPlatform.YOUTUBE,
    externalAccountId: "youtube-channel-id",
    externalAccountName: "YouTube Channel",
    accessTokenEncrypted: "encrypted:access-token",
    refreshTokenEncrypted: null,
    expiresAt: null,
    metadata: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("accountService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    providerMocks.isConfigured.mockReturnValue(true);
    providerMocks.buildAuthorizationUrl.mockReturnValue(
      "https://oauth.example/authorize",
    );
    providerMocks.exchangeCode.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: new Date("2026-06-30T11:00:00.000Z"),
      rawResponse: {
        access_token: "access-token",
      },
    });
    providerMocks.fetchAccountProfile.mockResolvedValue({
      externalAccountId: "youtube-channel-id",
      externalAccountName: "YouTube Channel",
      rawResponse: {
        id: "youtube-channel-id",
      },
    });
    prismaMocks.platformAccount.upsert.mockResolvedValue(buildAccount());
    prismaMocks.platformAccount.findUnique.mockResolvedValue(buildAccount());
    prismaMocks.platformAccount.findMany.mockResolvedValue([buildAccount()]);
    prismaMocks.platformAccount.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("starts OAuth with a signed state", () => {
    const result = startOAuth(userId, PLATFORM.YOUTUBE);

    expect(providerMocks.buildAuthorizationUrl).toHaveBeenCalledWith("signed-state");
    expect(result.authorizationUrl).toBe("https://oauth.example/authorize");
  });

  it("rejects unconfigured providers", () => {
    providerMocks.isConfigured.mockReturnValue(false);

    expect(() => startOAuth(userId, PLATFORM.YOUTUBE)).toThrow(
      "YouTube OAuth is not configured",
    );
  });

  it("exchanges code and upserts encrypted account tokens", async () => {
    const result = await completeOAuthCallback(
      PLATFORM.YOUTUBE,
      "code",
      "state",
    );

    expect(prismaMocks.platformAccount.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_platform: {
            userId,
            platform: PrismaPlatform.YOUTUBE,
          },
        },
        create: expect.objectContaining({
          accessTokenEncrypted: "encrypted:access-token",
          refreshTokenEncrypted: "encrypted:refresh-token",
        }),
        update: expect.objectContaining({
          accessTokenEncrypted: "encrypted:access-token",
          refreshTokenEncrypted: "encrypted:refresh-token",
        }),
      }),
    );
    expect(result).toEqual(
      expect.not.objectContaining({
        accessTokenEncrypted: expect.any(String),
        refreshTokenEncrypted: expect.any(String),
      }),
    );
  });

  it("lists safe account responses", async () => {
    const accounts = await listAccounts(userId);

    expect(accounts[0]).toMatchObject({
      platform: PLATFORM.YOUTUBE,
      externalAccountName: "YouTube Channel",
      isActive: true,
    });
    expect(accounts[0]).not.toHaveProperty("accessTokenEncrypted");
  });

  it("disconnects only the user's platform account", async () => {
    await disconnectAccount(userId, PLATFORM.YOUTUBE);

    expect(prismaMocks.platformAccount.deleteMany).toHaveBeenCalledWith({
      where: {
        userId,
        platform: PrismaPlatform.YOUTUBE,
      },
    });
  });

  it("returns decrypted active platform account secrets for the worker", async () => {
    const secret = await getActivePlatformAccountSecret(userId, PLATFORM.YOUTUBE);

    expect(prismaMocks.platformAccount.findUnique).toHaveBeenCalledWith({
      where: {
        userId_platform: {
          userId,
          platform: PrismaPlatform.YOUTUBE,
        },
      },
    });
    expect(secret).toEqual({
      accessToken: "decrypted:encrypted:access-token",
      externalAccountId: "youtube-channel-id",
      metadata: null,
      expiresAt: null,
    });
  });

  it("rejects missing platform account secrets", async () => {
    prismaMocks.platformAccount.findUnique.mockResolvedValueOnce(null);

    await expect(
      getActivePlatformAccountSecret(userId, PLATFORM.YOUTUBE),
    ).rejects.toMatchObject({
      code: "PlatformAccountNotConnected",
    });
  });

  it("rejects inactive platform account secrets", async () => {
    prismaMocks.platformAccount.findUnique.mockResolvedValueOnce(
      buildAccount({ isActive: false }),
    );

    await expect(
      getActivePlatformAccountSecret(userId, PLATFORM.YOUTUBE),
    ).rejects.toMatchObject({
      code: "PlatformAccountInactive",
    });
  });

  it("rejects expired platform account secrets", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    prismaMocks.platformAccount.findUnique.mockResolvedValueOnce(
      buildAccount({ expiresAt: new Date("2026-06-30T09:00:00.000Z") }),
    );

    await expect(
      getActivePlatformAccountSecret(userId, PLATFORM.YOUTUBE),
    ).rejects.toMatchObject({
      code: "PlatformAccountExpired",
    });

    vi.useRealTimers();
  });

});
