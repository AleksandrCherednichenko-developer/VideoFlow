import crypto from "node:crypto";

import { AppError } from "../../api/errors/AppError.js";
import { env } from "../../config/env.js";
import type { Platform } from "../../config/constants.js";

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

interface OAuthStatePayload {
  userId: string;
  platform: Platform;
  nonce: string;
  expiresAt: string;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(encodedPayload: string): string {
  return crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(encodedPayload)
    .digest("base64url");
}

function isOAuthStatePayload(value: unknown): value is OAuthStatePayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "userId" in value &&
    typeof value.userId === "string" &&
    "platform" in value &&
    typeof value.platform === "string" &&
    "nonce" in value &&
    typeof value.nonce === "string" &&
    "expiresAt" in value &&
    typeof value.expiresAt === "string"
  );
}

export function createOAuthState(userId: string, platform: Platform): string {
  const payload: OAuthStatePayload = {
    userId,
    platform,
    nonce: crypto.randomUUID(),
    expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS).toISOString(),
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyOAuthState(
  state: string,
  expectedPlatform: Platform,
): OAuthStatePayload {
  const [encodedPayload, signature] = state.split(".");

  if (encodedPayload === undefined || signature === undefined) {
    throw new AppError(400, "InvalidOAuthState", "Invalid OAuth state");
  }

  const expectedSignature = signPayload(encodedPayload);

  if (signature.length !== expectedSignature.length) {
    throw new AppError(400, "InvalidOAuthState", "Invalid OAuth state");
  }

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    )
  ) {
    throw new AppError(400, "InvalidOAuthState", "Invalid OAuth state");
  }

  let parsedPayload: unknown;

  try {
    parsedPayload = JSON.parse(decodeBase64Url(encodedPayload));
  } catch {
    throw new AppError(400, "InvalidOAuthState", "Invalid OAuth state");
  }

  if (!isOAuthStatePayload(parsedPayload)) {
    throw new AppError(400, "InvalidOAuthState", "Invalid OAuth state");
  }

  if (parsedPayload.platform !== expectedPlatform) {
    throw new AppError(400, "InvalidOAuthState", "Invalid OAuth state");
  }

  if (new Date(parsedPayload.expiresAt).getTime() <= Date.now()) {
    throw new AppError(400, "ExpiredOAuthState", "OAuth state expired");
  }

  return parsedPayload;
}
