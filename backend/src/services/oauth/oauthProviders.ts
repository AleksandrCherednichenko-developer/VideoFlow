import { AppError } from "../../api/errors/AppError.js";
import { env } from "../../config/env.js";
import { PLATFORM, type Platform } from "../../config/constants.js";

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  rawResponse: unknown;
}

export interface OAuthAccountProfile {
  externalAccountId?: string;
  externalAccountName?: string;
  rawResponse?: unknown;
}

export interface OAuthProvider {
  platform: Platform;
  displayName: string;
  isConfigured: () => boolean;
  buildAuthorizationUrl: (state: string) => string;
  exchangeCode: (code: string) => Promise<OAuthTokens>;
  fetchAccountProfile: (tokens: OAuthTokens) => Promise<OAuthAccountProfile>;
}

interface YouTubeTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

interface YouTubeChannelsResponse {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
    };
  }>;
}

function normalizeOptionalEnv(value: string | undefined): string | null {
  const normalizedValue = value?.trim();

  return normalizedValue === undefined || normalizedValue.length === 0
    ? null
    : normalizedValue;
}

function buildExpiresAt(expiresInSeconds: number | undefined): Date | undefined {
  if (expiresInSeconds === undefined) {
    return undefined;
  }

  return new Date(Date.now() + expiresInSeconds * 1000);
}

function buildOAuthTokens(input: {
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds?: number;
  rawResponse: unknown;
}): OAuthTokens {
  const tokens: OAuthTokens = {
    accessToken: input.accessToken,
    rawResponse: input.rawResponse,
  };
  const expiresAt = buildExpiresAt(input.expiresInSeconds);

  if (input.refreshToken !== undefined) {
    tokens.refreshToken = input.refreshToken;
  }

  if (expiresAt !== undefined) {
    tokens.expiresAt = expiresAt;
  }

  return tokens;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AppError(
      502,
      "OAuthProviderRequestFailed",
      "OAuth provider request failed",
    );
  }

  return responseBody;
}

function getRequiredToken(value: unknown): string {
  if (isObject(value) && typeof value.access_token === "string") {
    return value.access_token;
  }

  throw new AppError(
    502,
    "OAuthProviderInvalidResponse",
    "OAuth provider returned an invalid token response",
  );
}

function getYouTubeConfig():
  | {
      clientId: string;
      clientSecret: string;
      redirectUrl: string;
    }
  | null {
  const clientId = normalizeOptionalEnv(env.YOUTUBE_CLIENT_ID);
  const clientSecret = normalizeOptionalEnv(env.YOUTUBE_CLIENT_SECRET);
  const redirectUrl = normalizeOptionalEnv(env.YOUTUBE_REDIRECT_URL);

  if (clientId === null || clientSecret === null || redirectUrl === null) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUrl,
  };
}

export const youtubeProvider: OAuthProvider = {
  platform: PLATFORM.YOUTUBE,
  displayName: "YouTube",
  isConfigured: () => getYouTubeConfig() !== null,
  buildAuthorizationUrl: (state) => {
    const config = getYouTubeConfig();

    if (config === null) {
      throw new AppError(
        503,
        "OAuthProviderNotConfigured",
        "YouTube OAuth is not configured",
      );
    }

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUrl);
    url.searchParams.set("response_type", "code");
    url.searchParams.set(
      "scope",
      [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly",
      ].join(" "),
    );
    url.searchParams.set("state", state);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("include_granted_scopes", "true");

    return url.toString();
  },
  exchangeCode: async (code) => {
    const config = getYouTubeConfig();

    if (config === null) {
      throw new AppError(
        503,
        "OAuthProviderNotConfigured",
        "YouTube OAuth is not configured",
      );
    }

    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUrl,
    });
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const responseBody = await readJsonResponse(response);
    const accessToken = getRequiredToken(responseBody);
    const tokenResponse = responseBody as YouTubeTokenResponse;

    return buildOAuthTokens({
      accessToken,
      ...(typeof tokenResponse.refresh_token === "string"
        ? { refreshToken: tokenResponse.refresh_token }
        : {}),
      ...(typeof tokenResponse.expires_in === "number"
        ? { expiresInSeconds: tokenResponse.expires_in }
        : {}),
      rawResponse: responseBody,
    });
  },
  fetchAccountProfile: async (tokens) => {
    const url = new URL("https://www.googleapis.com/youtube/v3/channels");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("mine", "true");

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });
    const responseBody = await readJsonResponse(response);
    const channel = (responseBody as YouTubeChannelsResponse).items?.[0];

    return {
      ...(channel?.id !== undefined ? { externalAccountId: channel.id } : {}),
      ...(channel?.snippet?.title !== undefined
        ? { externalAccountName: channel.snippet.title }
        : {}),
      rawResponse: responseBody,
    };
  },
};

export const OAUTH_PROVIDERS = {
  [PLATFORM.YOUTUBE]: youtubeProvider,
} as const;

export type SupportedOAuthPlatform = keyof typeof OAUTH_PROVIDERS;

export function getOAuthProvider(platform: Platform): OAuthProvider {
  const provider = OAUTH_PROVIDERS[platform as SupportedOAuthPlatform];

  if (provider === undefined) {
    throw new AppError(
      400,
      "UnsupportedOAuthPlatform",
      "OAuth platform is not supported yet",
    );
  }

  return provider;
}
