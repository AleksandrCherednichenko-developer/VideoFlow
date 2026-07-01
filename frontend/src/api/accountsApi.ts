import { httpClient } from "./httpClient";

export const ACCOUNT_PLATFORM = {
  YOUTUBE: "youtube",
  VK: "vk",
  INSTAGRAM: "instagram",
  THREADS: "threads",
  TIKTOK: "tiktok",
  PINTEREST: "pinterest",
} as const;

export type AccountPlatform =
  (typeof ACCOUNT_PLATFORM)[keyof typeof ACCOUNT_PLATFORM];

export interface AccountResponse {
  id: string;
  platform: AccountPlatform;
  externalAccountId: string | null;
  externalAccountName: string | null;
  expiresAt: string | null;
  isExpired: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListAccountsResponse {
  accounts: AccountResponse[];
}

export interface StartOAuthResponse {
  authorizationUrl: string;
}

export async function listAccounts(): Promise<ListAccountsResponse> {
  const response = await httpClient.get<ListAccountsResponse>("/accounts");

  return response.data;
}

export async function startOAuth(
  platform: AccountPlatform,
): Promise<StartOAuthResponse> {
  const response = await httpClient.get<StartOAuthResponse>(
    `/oauth/${platform}/start`,
  );

  return response.data;
}

export async function disconnectAccount(
  platform: AccountPlatform,
): Promise<void> {
  await httpClient.delete(`/accounts/${platform}`);
}
