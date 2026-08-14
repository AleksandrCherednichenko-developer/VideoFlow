import {
  ACCOUNT_PLATFORM,
  type AccountPlatform,
  type AccountResponse,
} from "../api/accountsApi";

export const CONNECTABLE_ACCOUNT_PLATFORMS = [
  ACCOUNT_PLATFORM.VK,
  ACCOUNT_PLATFORM.YOUTUBE,
] as const;

export const ACCOUNT_CONNECTION_METHOD = {
  OAUTH: "oauth",
  MANUAL_VK: "manual-vk",
} as const;

export type AccountConnectionMethod =
  (typeof ACCOUNT_CONNECTION_METHOD)[keyof typeof ACCOUNT_CONNECTION_METHOD];

export const ACCOUNT_PLATFORM_LIST = [
  ACCOUNT_PLATFORM.VK,
  ACCOUNT_PLATFORM.YOUTUBE,
  ACCOUNT_PLATFORM.INSTAGRAM,
  ACCOUNT_PLATFORM.THREADS,
  ACCOUNT_PLATFORM.TIKTOK,
  ACCOUNT_PLATFORM.PINTEREST,
] as const;

export interface AccountPlatformCard {
  platform: AccountPlatform;
  label: string;
  isConnectable: boolean;
  connectionMethod: AccountConnectionMethod | null;
  account: AccountResponse | null;
}

export function getAccountConnectionMethod(
  platform: AccountPlatform,
): AccountConnectionMethod | null {
  if (!isAccountPlatformConnectable(platform)) {
    return null;
  }

  if (platform === ACCOUNT_PLATFORM.VK) {
    return ACCOUNT_CONNECTION_METHOD.MANUAL_VK;
  }

  return ACCOUNT_CONNECTION_METHOD.OAUTH;
}

export function getAccountPlatformLabel(platform: AccountPlatform): string {
  const labels = {
    [ACCOUNT_PLATFORM.VK]: "VK",
    [ACCOUNT_PLATFORM.YOUTUBE]: "YouTube",
    [ACCOUNT_PLATFORM.INSTAGRAM]: "Instagram",
    [ACCOUNT_PLATFORM.THREADS]: "Threads",
    [ACCOUNT_PLATFORM.TIKTOK]: "TikTok",
    [ACCOUNT_PLATFORM.PINTEREST]: "Pinterest",
  } as const satisfies Record<AccountPlatform, string>;

  return labels[platform];
}

export function isAccountPlatformConnectable(
  platform: AccountPlatform,
): boolean {
  return CONNECTABLE_ACCOUNT_PLATFORMS.includes(
    platform as (typeof CONNECTABLE_ACCOUNT_PLATFORMS)[number],
  );
}

export function buildAccountPlatformCards(
  accounts: AccountResponse[],
): AccountPlatformCard[] {
  return ACCOUNT_PLATFORM_LIST.map((platform) => ({
    platform,
    label: getAccountPlatformLabel(platform),
    isConnectable: isAccountPlatformConnectable(platform),
    connectionMethod: getAccountConnectionMethod(platform),
    account:
      accounts.find((account) => account.platform === platform && account.isActive) ??
      null,
  }));
}

export function formatAccountExpiry(expiresAt: string | null): string {
  if (expiresAt === null) {
    return "No expiry reported";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(expiresAt));
}
