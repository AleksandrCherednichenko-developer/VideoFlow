import { z } from "zod";

import { PLATFORM } from "../../config/constants.js";

export const PUBLICATION_TEXT_MAX_LENGTH = 5_000;
export const PUBLICATION_TITLE_MAX_LENGTH = 150;

const textOverrideSchema = z
  .string()
  .trim()
  .min(1)
  .max(PUBLICATION_TEXT_MAX_LENGTH)
  .nullable()
  .optional();

const titleSchema = z
  .string()
  .trim()
  .min(1)
  .max(PUBLICATION_TITLE_MAX_LENGTH)
  .optional();

const boardIdSchema = z.string().trim().min(1).max(255).optional();

const youtubePlatformSchema = z.object({
  platform: z.literal(PLATFORM.YOUTUBE),
  enabled: z.boolean(),
  title: titleSchema,
  text: textOverrideSchema,
});

const instagramPlatformSchema = z.object({
  platform: z.literal(PLATFORM.INSTAGRAM),
  enabled: z.boolean(),
  text: textOverrideSchema,
});

const vkPlatformSchema = z.object({
  platform: z.literal(PLATFORM.VK),
  enabled: z.boolean(),
  text: textOverrideSchema,
});

const tiktokPlatformSchema = z.object({
  platform: z.literal(PLATFORM.TIKTOK),
  enabled: z.boolean(),
  text: textOverrideSchema,
});

const pinterestPlatformSchema = z.object({
  platform: z.literal(PLATFORM.PINTEREST),
  enabled: z.boolean(),
  title: titleSchema,
  text: textOverrideSchema,
  board_id: boardIdSchema,
});

export const publicationPlatformSchema = z.discriminatedUnion("platform", [
  youtubePlatformSchema,
  instagramPlatformSchema,
  vkPlatformSchema,
  tiktokPlatformSchema,
  pinterestPlatformSchema,
]);

export const createPublicationSchema = z
  .object({
    videoR2Key: z.string().min(1).max(512),
    defaultText: z.string().trim().min(1).max(PUBLICATION_TEXT_MAX_LENGTH),
    scheduledAt: z.string().datetime(),
    platforms: z.array(publicationPlatformSchema).min(1),
  })
  .superRefine((input, context) => {
    const seenPlatforms = new Set<string>();

    for (const platformSettings of input.platforms) {
      if (seenPlatforms.has(platformSettings.platform)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["platforms"],
          message: `Duplicate platform settings for ${platformSettings.platform}`,
        });
      }

      seenPlatforms.add(platformSettings.platform);
    }

    if (!input.platforms.some((platformSettings) => platformSettings.enabled)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["platforms"],
        message: "At least one platform must be enabled",
      });
    }

    for (const platformSettings of input.platforms) {
      if (!platformSettings.enabled) {
        continue;
      }

      if (
        platformSettings.platform === PLATFORM.YOUTUBE &&
        platformSettings.title === undefined
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["platforms"],
          message: "YouTube requires title",
        });
      }

      if (platformSettings.platform === PLATFORM.PINTEREST) {
        if (platformSettings.title === undefined) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["platforms"],
            message: "Pinterest requires title",
          });
        }

        if (platformSettings.board_id === undefined) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["platforms"],
            message: "Pinterest requires board_id",
          });
        }
      }
    }
  });

export const publicationIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type CreatePublicationInput = z.infer<typeof createPublicationSchema>;
export type PublicationPlatformInput = z.infer<typeof publicationPlatformSchema>;
