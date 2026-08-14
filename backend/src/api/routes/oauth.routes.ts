import { Router } from "express";

import { AppError } from "../errors/AppError.js";
import { authenticate } from "../middleware/authenticate.js";
import { env } from "../../config/env.js";
import {
  accountPlatformParamsSchema,
  oauthCallbackQuerySchema,
  oauthPlatformParamsSchema,
  vkConnectBodySchema,
} from "../../services/oauth/oauthSchemas.js";
import {
  completeOAuthCallback,
  connectVkCommunityAccount,
  disconnectAccount,
  listAccounts,
  startOAuth,
} from "../../services/oauth/accountService.js";

export const oauthRouter = Router();

function getAuthenticatedUserId(req: {
  authUser?: { id: string };
}): string {
  if (req.authUser === undefined) {
    throw new AppError(401, "Unauthorized", "Missing authenticated user");
  }

  return req.authUser.id;
}

function buildAccountsRedirect(params: Record<string, string>): string {
  const url = new URL("/accounts", env.FRONTEND_URL);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

oauthRouter.get(
  "/oauth/:platform/start",
  authenticate,
  async (req, res, next) => {
    try {
      const userId = getAuthenticatedUserId(req);
      const params = oauthPlatformParamsSchema.parse(req.params);
      const result = startOAuth(userId, params.platform);

      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

oauthRouter.get("/oauth/:platform/callback", async (req, res) => {
  const platform = typeof req.params.platform === "string" ? req.params.platform : "";

  try {
    const params = oauthPlatformParamsSchema.parse(req.params);
    const query = oauthCallbackQuerySchema.parse(req.query);

    if (query.error !== undefined) {
      res.redirect(
        buildAccountsRedirect({
          oauth: "error",
          platform: params.platform,
          code: query.error,
        }),
      );
      return;
    }

    if (query.code === undefined || query.state === undefined) {
      throw new AppError(
        400,
        "MissingOAuthCallbackParams",
        "Missing OAuth callback parameters",
      );
    }

    await completeOAuthCallback(params.platform, query.code, query.state);
    res.redirect(
      buildAccountsRedirect({
        oauth: "connected",
        platform: params.platform,
      }),
    );
  } catch (error) {
    const code = error instanceof AppError ? error.code : "OAuthCallbackFailed";

    res.redirect(
      buildAccountsRedirect({
        oauth: "error",
        platform,
        code,
      }),
    );
  }
});

oauthRouter.get("/accounts", authenticate, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const accounts = await listAccounts(userId);

    res.json({
      accounts,
    });
  } catch (error) {
    next(error);
  }
});

oauthRouter.post("/accounts/vk/connect", authenticate, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const body = vkConnectBodySchema.parse(req.body);
    const account = await connectVkCommunityAccount(
      userId,
      body.groupId,
      body.accessToken,
    );

    res.status(200).json(account);
  } catch (error) {
    next(error);
  }
});

oauthRouter.delete(
  "/accounts/:platform",
  authenticate,
  async (req, res, next) => {
    try {
      const userId = getAuthenticatedUserId(req);
      const params = accountPlatformParamsSchema.parse(req.params);

      await disconnectAccount(userId, params.platform);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);
