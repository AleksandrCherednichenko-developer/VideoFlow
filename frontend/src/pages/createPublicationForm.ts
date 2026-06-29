import {
  PLATFORM,
  type CreatePublicationRequest,
  type PublicationPlatformPayload,
} from "../api/publicationApi";

export const MAX_VIDEO_SIZE_BYTES = 512 * 1024 * 1024;
export const MAX_PUBLICATION_TEXT_LENGTH = 5_000;
export const MAX_PUBLICATION_TITLE_LENGTH = 150;

export const ALLOWED_VIDEO_CONTENT_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

export interface PlatformSelectionState {
  youtube: boolean;
  vk: boolean;
}

export interface PlatformOverrideState {
  youtubeText: string;
  vkText: string;
}

export interface CreatePublicationFormState {
  videoR2Key: string;
  defaultText: string;
  date: string;
  time: string;
  platforms: PlatformSelectionState;
  youtubeTitle: string;
  overrides: PlatformOverrideState;
}

export function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const units = ["KB", "MB", "GB"] as const;
  let size = sizeBytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

export function isAllowedVideoContentType(contentType: string): boolean {
  return ALLOWED_VIDEO_CONTENT_TYPES.includes(
    contentType as (typeof ALLOWED_VIDEO_CONTENT_TYPES)[number],
  );
}

export function localDateTimeToUtcIso(date: string, time: string): string | null {
  if (date.length === 0 || time.length === 0) {
    return null;
  }

  const localDate = new Date(`${date}T${time}`);

  if (Number.isNaN(localDate.getTime())) {
    return null;
  }

  return localDate.toISOString();
}

function normalizeOptionalText(value: string): string | null {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

export function buildPublicationPlatforms(
  platforms: PlatformSelectionState,
  youtubeTitle: string,
  overrides: PlatformOverrideState,
): PublicationPlatformPayload[] {
  return [
    {
      platform: PLATFORM.YOUTUBE,
      enabled: platforms.youtube,
      ...(youtubeTitle.trim().length > 0
        ? { title: youtubeTitle.trim() }
        : {}),
      text: normalizeOptionalText(overrides.youtubeText),
    },
    {
      platform: PLATFORM.VK,
      enabled: platforms.vk,
      text: normalizeOptionalText(overrides.vkText),
    },
  ];
}

export function buildCreatePublicationRequest(
  state: CreatePublicationFormState,
): CreatePublicationRequest | null {
  const scheduledAt = localDateTimeToUtcIso(state.date, state.time);

  if (scheduledAt === null) {
    return null;
  }

  return {
    videoR2Key: state.videoR2Key,
    defaultText: state.defaultText.trim(),
    scheduledAt,
    platforms: buildPublicationPlatforms(
      state.platforms,
      state.youtubeTitle,
      state.overrides,
    ),
  };
}
