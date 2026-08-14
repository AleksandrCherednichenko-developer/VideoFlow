import bcrypt from "bcrypt";

import { AppError } from "../../api/errors/AppError.js";
import { prisma } from "../../db/prisma.js";
import type { LoginInput, RegisterInput } from "./authSchemas.js";
import {
  createRefreshToken,
  hashToken,
  signAccessToken,
  verifyRefreshToken,
} from "./tokenService.js";

const PASSWORD_HASH_ROUNDS = 12;

export interface AuthUserResponse {
  id: string;
  email: string;
  timezone: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUserResponse;
}

function toAuthUserResponse(user: {
  id: string;
  email: string;
  timezone: string;
}): AuthUserResponse {
  return {
    id: user.id,
    email: user.email,
    timezone: user.timezone,
  };
}

async function createSession(user: AuthUserResponse): Promise<AuthSession> {
  const refreshToken = createRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshToken.tokenHash,
      expiresAt: refreshToken.expiresAt,
    },
  });

  return {
    accessToken: signAccessToken({
      sub: user.id,
      email: user.email,
    }),
    refreshToken: refreshToken.token,
    user,
  };
}

export async function registerUser(input: RegisterInput): Promise<AuthSession> {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (existingUser !== null) {
    throw new AppError(409, "EmailAlreadyExists", "Email is already registered");
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      timezone: input.timezone,
    },
    select: {
      id: true,
      email: true,
      timezone: true,
    },
  });

  return createSession(toAuthUserResponse(user));
}

export async function loginUser(input: LoginInput): Promise<AuthSession> {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (user === null) {
    throw new AppError(401, "InvalidCredentials", "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError(401, "InvalidCredentials", "Invalid email or password");
  }

  return createSession(toAuthUserResponse(user));
}

export async function refreshSession(refreshToken: string): Promise<AuthSession> {
  let userId: string;

  try {
    userId = verifyRefreshToken(refreshToken).sub;
  } catch {
    throw new AppError(401, "InvalidRefreshToken", "Invalid refresh token");
  }

  const tokenHash = hashToken(refreshToken);
  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          timezone: true,
        },
      },
    },
  });

  if (
    storedToken === null ||
    storedToken.userId !== userId ||
    storedToken.revokedAt !== null ||
    storedToken.expiresAt <= new Date()
  ) {
    throw new AppError(401, "InvalidRefreshToken", "Invalid refresh token");
  }

  await prisma.refreshToken.update({
    where: {
      id: storedToken.id,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return createSession(toAuthUserResponse(storedToken.user));
}

export async function logoutUser(refreshToken: string | undefined): Promise<void> {
  if (refreshToken === undefined) {
    return;
  }

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash: hashToken(refreshToken),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function getUserById(userId: string): Promise<AuthUserResponse> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      timezone: true,
    },
  });

  if (user === null) {
    throw new AppError(404, "UserNotFound", "User not found");
  }

  return toAuthUserResponse(user);
}
