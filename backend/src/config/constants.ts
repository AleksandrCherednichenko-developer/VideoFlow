export const PUBLICATION_STATUS = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  PUBLISHING: "publishing",
  PUBLISHED: "published",
  PARTIAL: "partial",
  FAILED: "failed",
} as const;

export type PublicationStatus =
  (typeof PUBLICATION_STATUS)[keyof typeof PUBLICATION_STATUS];

export const PLATFORM = {
  YOUTUBE: "youtube",
  VK: "vk",
  INSTAGRAM: "instagram",
  TIKTOK: "tiktok",
  PINTEREST: "pinterest",
} as const;

export type Platform = (typeof PLATFORM)[keyof typeof PLATFORM];

export const PLATFORM_RESULT_STATUS = {
  PENDING: "pending",
  PUBLISHING: "publishing",
  PUBLISHED: "published",
  FAILED: "failed",
  SKIPPED: "skipped",
} as const;

export type PlatformResultStatus =
  (typeof PLATFORM_RESULT_STATUS)[keyof typeof PLATFORM_RESULT_STATUS];
