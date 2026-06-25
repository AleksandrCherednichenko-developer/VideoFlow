import type { Response } from "express";
import { Router } from "express";

import { authenticate } from "../middleware/authenticate.js";
import { authRateLimit } from "../middleware/authRateLimit.js";
import { AppError } from "../errors/AppError.js";
import { loginSchema, registerSchema } from "../../services/auth/authSchemas.js";
import {
  getUserById,
  loginUser,
  logoutUser,
  refreshSession,
  registerUser,
  type AuthSession,
} from "../../services/auth/authService.js";

const REFRESH_COOKIE_NAME = "vf_refresh";
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export const authRouter = Router();

function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth",
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth",
  });
}

function sendSession(res: Response, session: AuthSession): void {
  setRefreshCookie(res, session.refreshToken);
  res.json({
    accessToken: session.accessToken,
    user: session.user,
  });
}

function getRefreshCookie(cookies: unknown): string | undefined {
  if (
    typeof cookies === "object" &&
    cookies !== null &&
    REFRESH_COOKIE_NAME in cookies
  ) {
    const cookieValue = cookies[REFRESH_COOKIE_NAME as keyof typeof cookies];
    return typeof cookieValue === "string" ? cookieValue : undefined;
  }

  return undefined;
}

authRouter.post("/auth/register", authRateLimit, async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const session = await registerUser(input);
    res.status(201);
    sendSession(res, session);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/auth/login", authRateLimit, async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const session = await loginUser(input);
    sendSession(res, session);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/auth/refresh", authRateLimit, async (req, res, next) => {
  try {
    const refreshToken = getRefreshCookie(req.cookies);

    if (refreshToken === undefined) {
      throw new AppError(401, "MissingRefreshToken", "Missing refresh token");
    }

    const session = await refreshSession(refreshToken);
    sendSession(res, session);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/auth/logout", async (req, res, next) => {
  try {
    await logoutUser(getRefreshCookie(req.cookies));
    clearRefreshCookie(res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

authRouter.get("/auth/me", authenticate, async (req, res, next) => {
  try {
    if (req.authUser === undefined) {
      throw new AppError(401, "Unauthorized", "Missing authenticated user");
    }

    const user = await getUserById(req.authUser.id);
    res.json({
      user,
    });
  } catch (error) {
    next(error);
  }
});
