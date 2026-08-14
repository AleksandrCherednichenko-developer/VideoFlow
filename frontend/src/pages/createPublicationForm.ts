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
  instagram: boolean;
  tiktok: boolean;
}

export interface PlatformOverrideState {
  youtubeText: string;
  instagramText: string;
  tiktokText: string;
}

export interface SelectedVideoFile {
  name: string;
  size: number;
  type: string;
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

export interface CreatePublicationValidationState
  extends Omit<CreatePublicationFormState, "videoR2Key"> {
  selectedFile: SelectedVideoFile | null;
}

export interface CreatePublicationValidationErrors {
  selectedFile?: string;
  defaultText?: string;
  scheduledAt?: string;
  platforms?: string;
  youtubeTitle?: string;
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

export function validateSelectedVideoFile(
  file: SelectedVideoFile | null,
): string | null {
  if (file === null) {
    return "Choose a video file.";
  }

  if (!isAllowedVideoContentType(file.type)) {
    return "Use an MP4, MOV, or WebM video.";
  }

  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return `Video must be ${formatFileSize(MAX_VIDEO_SIZE_BYTES)} or smaller.`;
  }

  return null;
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
      platform: PLATFORM.INSTAGRAM,
      enabled: platforms.instagram,
      text: normalizeOptionalText(overrides.instagramText),
    },
    {
      platform: PLATFORM.TIKTOK,
      enabled: platforms.tiktok,
      text: normalizeOptionalText(overrides.tiktokText),
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

export function validateCreatePublicationForm(
  state: CreatePublicationValidationState,
): CreatePublicationValidationErrors {
  const errors: CreatePublicationValidationErrors = {};
  const fileError = validateSelectedVideoFile(state.selectedFile);

  if (fileError !== null) {
    errors.selectedFile = fileError;
  }

  if (state.defaultText.trim().length === 0) {
    errors.defaultText = "Add a publication text.";
  } else if (state.defaultText.trim().length > MAX_PUBLICATION_TEXT_LENGTH) {
    errors.defaultText = `Text must be ${MAX_PUBLICATION_TEXT_LENGTH} characters or fewer.`;
  }

  if (localDateTimeToUtcIso(state.date, state.time) === null) {
    errors.scheduledAt = "Choose a valid publication date and time.";
  }

  if (
    !state.platforms.youtube &&
    !state.platforms.instagram &&
    !state.platforms.tiktok
  ) {
    errors.platforms = "Choose at least one platform.";
  }

  if (state.platforms.youtube) {
    if (state.youtubeTitle.trim().length === 0) {
      errors.youtubeTitle = "Add a YouTube title.";
    } else if (state.youtubeTitle.trim().length > MAX_PUBLICATION_TITLE_LENGTH) {
      errors.youtubeTitle = `Title must be ${MAX_PUBLICATION_TITLE_LENGTH} characters or fewer.`;
    }
  }

  return errors;
}

export function hasCreatePublicationValidationErrors(
  errors: CreatePublicationValidationErrors,
): boolean {
  return Object.keys(errors).length > 0;
}
