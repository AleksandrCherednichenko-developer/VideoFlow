import { z } from "zod";

import { PLATFORM } from "../../config/constants.js";

export const oauthPlatformParamsSchema = z.object({
  platform: z.enum([PLATFORM.YOUTUBE, PLATFORM.VK]),
});

export const accountPlatformParamsSchema = oauthPlatformParamsSchema;

export const oauthCallbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().min(1).optional(),
});

export type OAuthPlatformParams = z.infer<typeof oauthPlatformParamsSchema>;
export type OAuthCallbackQuery = z.infer<typeof oauthCallbackQuerySchema>;
