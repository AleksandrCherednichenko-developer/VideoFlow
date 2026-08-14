import { z } from "zod";

import { PLATFORM } from "../../config/constants.js";

export const oauthPlatformParamsSchema = z.object({
  platform: z.enum([PLATFORM.YOUTUBE]),
});

export const accountPlatformParamsSchema = z.object({
  platform: z.enum([PLATFORM.YOUTUBE, PLATFORM.VK]),
});

export const vkConnectBodySchema = z.object({
  groupId: z.string().min(1),
  accessToken: z.string().min(1),
});

export const oauthCallbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().min(1).optional(),
});

export type OAuthPlatformParams = z.infer<typeof oauthPlatformParamsSchema>;
export type AccountPlatformParams = z.infer<typeof accountPlatformParamsSchema>;
export type OAuthCallbackQuery = z.infer<typeof oauthCallbackQuerySchema>;
export type VkConnectBody = z.infer<typeof vkConnectBodySchema>;
