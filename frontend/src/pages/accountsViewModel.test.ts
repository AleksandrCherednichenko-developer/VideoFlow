import { describe, expect, it } from "vitest";

import {
  ACCOUNT_PLATFORM,
  type AccountResponse,
} from "../api/accountsApi";
import {
  ACCOUNT_CONNECTION_METHOD,
  ACCOUNT_PLATFORM_LIST,
  buildAccountPlatformCards,
  getAccountConnectionMethod,
  getAccountPlatformLabel,
  isAccountPlatformConnectable,
} from "./accountsViewModel";

function buildAccount(overrides: Partial<AccountResponse>): AccountResponse {
  return {
    id: "account-id",
    platform: ACCOUNT_PLATFORM.YOUTUBE,
    externalAccountId: "external-id",
    externalAccountName: "External Account",
    expiresAt: null,
    isExpired: false,
    isActive: true,
    createdAt: "2026-06-30T10:00:00.000Z",
    updatedAt: "2026-06-30T10:00:00.000Z",
    ...overrides,
  };
}

describe("accountsViewModel", () => {
  it("marks only implemented OAuth platforms as connectable", () => {
    expect(isAccountPlatformConnectable(ACCOUNT_PLATFORM.VK)).toBe(false);
    expect(isAccountPlatformConnectable(ACCOUNT_PLATFORM.YOUTUBE)).toBe(true);
    expect(isAccountPlatformConnectable(ACCOUNT_PLATFORM.INSTAGRAM)).toBe(false);
    expect(getAccountConnectionMethod(ACCOUNT_PLATFORM.VK)).toBeNull();
    expect(getAccountConnectionMethod(ACCOUNT_PLATFORM.YOUTUBE)).toBe(
      ACCOUNT_CONNECTION_METHOD.OAUTH,
    );
  });

  it("builds connected and coming-later cards", () => {
    const cards = buildAccountPlatformCards([
      buildAccount({
        platform: ACCOUNT_PLATFORM.YOUTUBE,
      }),
    ]);
    const youtubeCard = cards.find(
      (card) => card.platform === ACCOUNT_PLATFORM.YOUTUBE,
    );
    const instagramCard = cards.find(
      (card) => card.platform === ACCOUNT_PLATFORM.INSTAGRAM,
    );

    expect(youtubeCard).toMatchObject({
      label: "YouTube",
      isConnectable: true,
      connectionMethod: ACCOUNT_CONNECTION_METHOD.OAUTH,
      account: expect.objectContaining({
        externalAccountName: "External Account",
      }),
    });
    expect(instagramCard).toMatchObject({
      label: "Instagram",
      isConnectable: false,
      account: null,
    });
  });

  it("returns user-facing platform labels", () => {
    expect(getAccountPlatformLabel(ACCOUNT_PLATFORM.YOUTUBE)).toBe("YouTube");
    expect(getAccountPlatformLabel(ACCOUNT_PLATFORM.PINTEREST)).toBe("Pinterest");
    expect(ACCOUNT_PLATFORM_LIST).not.toContain("threads");
  });
});
