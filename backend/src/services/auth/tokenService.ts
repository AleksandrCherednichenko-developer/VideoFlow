import crypto from "node:crypto";

import jwt, { type JwtPayload } from "jsonwebtoken";

import { env } from "../../config/env.js";

export const TOKEN_TTL = {
  ACCESS_SECONDS: 15 * 60,
  REFRESH_SECONDS: 30 * 24 * 60 * 60,
} as const;

export interface AuthenticatedUser {
  id: string;
  email: string;
}

interface AccessTokenPayload {
  sub: string;
  email: string;
}

interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

export interface RefreshTokenResult {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

function isJwtPayload(value: string | JwtPayload): value is JwtPayload {
  return typeof value === "object" && value !== null;
}

function getStringClaim(payload: JwtPayload, claim: string): string {
  const value = payload[claim];

  if (typeof value !== "string") {
    throw new Error(`Invalid JWT claim: ${claim}`);
  }

  return value;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(
    {
      email: payload.email,
    },
    env.JWT_SECRET,
    {
      subject: payload.sub,
      expiresIn: TOKEN_TTL.ACCESS_SECONDS,
    },
  );
}

export function verifyAccessToken(token: string): AuthenticatedUser {
  const payload = jwt.verify(token, env.JWT_SECRET);

  if (!isJwtPayload(payload)) {
    throw new Error("Invalid access token payload");
  }

  const userId = getStringClaim(payload, "sub");
  const email = getStringClaim(payload, "email");

  return {
    id: userId,
    email,
  };
}

export function createRefreshToken(userId: string): RefreshTokenResult {
  const jti = crypto.randomUUID();
  const token = jwt.sign({}, env.JWT_REFRESH_SECRET, {
    subject: userId,
    jwtid: jti,
    expiresIn: TOKEN_TTL.REFRESH_SECONDS,
  });

  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + TOKEN_TTL.REFRESH_SECONDS * 1000),
  };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET);

  if (!isJwtPayload(payload)) {
    throw new Error("Invalid refresh token payload");
  }

  const userId = getStringClaim(payload, "sub");
  const jti = getStringClaim(payload, "jti");

  return {
    sub: userId,
    jti,
  };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
