import {
  PLATFORM,
  PLATFORM_RESULT_STATUS,
  PUBLICATION_STATUS,
  type MvpPlatform,
  type PlatformResultStatus,
  type PublicationResponse,
  type PublicationResultResponse,
  type PublicationStatus,
} from "../api/publicationApi";

export const PUBLICATIONS_REFETCH_INTERVAL_MS = 30_000;

export const PUBLICATION_STATUS_FILTER = {
  ALL: "all",
  SCHEDULED: PUBLICATION_STATUS.SCHEDULED,
  PUBLISHING: PUBLICATION_STATUS.PUBLISHING,
  PUBLISHED: PUBLICATION_STATUS.PUBLISHED,
  PARTIAL: PUBLICATION_STATUS.PARTIAL,
  FAILED: PUBLICATION_STATUS.FAILED,
} as const;

export type PublicationStatusFilter =
  (typeof PUBLICATION_STATUS_FILTER)[keyof typeof PUBLICATION_STATUS_FILTER];

export const PLATFORM_FILTER = {
  ALL: "all",
  YOUTUBE: PLATFORM.YOUTUBE,
  INSTAGRAM: PLATFORM.INSTAGRAM,
  TIKTOK: PLATFORM.TIKTOK,
} as const;

export type PlatformFilter =
  (typeof PLATFORM_FILTER)[keyof typeof PLATFORM_FILTER];

export interface StatusCounter {
  label: string;
  value: string;
}

export interface PlatformStatusRow {
  platform: MvpPlatform;
  label: string;
  status: PlatformResultStatus;
  resultUrl: string | null;
  errorMessage: string | null;
}

const DASHBOARD_STATUSES = [
  PUBLICATION_STATUS.SCHEDULED,
  PUBLICATION_STATUS.PUBLISHING,
  PUBLICATION_STATUS.PUBLISHED,
  PUBLICATION_STATUS.FAILED,
] as const;

export function getPublicationStatusLabel(status: PublicationStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function getPlatformLabel(platform: MvpPlatform): string {
  if (platform === PLATFORM.YOUTUBE) {
    return "YouTube";
  }

  if (platform === PLATFORM.INSTAGRAM) {
    return "Instagram";
  }

  return "TikTok";
}

export function formatPublicationDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function getEnabledPlatforms(
  publication: PublicationResponse,
): MvpPlatform[] {
  return publication.platforms
    .filter((platformSettings) => platformSettings.enabled)
    .map((platformSettings) => platformSettings.platform);
}

export function buildStatusCounters(
  publications: PublicationResponse[],
): StatusCounter[] {
  return DASHBOARD_STATUSES.map((status) => ({
    label: getPublicationStatusLabel(status),
    value: publications
      .filter((publication) => publication.status === status)
      .length.toString(),
  }));
}

export function getNextScheduledPublication(
  publications: PublicationResponse[],
  now: Date = new Date(),
): PublicationResponse | null {
  return (
    publications
      .filter(
        (publication) =>
          publication.status === PUBLICATION_STATUS.SCHEDULED &&
          new Date(publication.scheduledAt).getTime() >= now.getTime(),
      )
      .sort(
        (leftPublication, rightPublication) =>
          new Date(leftPublication.scheduledAt).getTime() -
          new Date(rightPublication.scheduledAt).getTime(),
      )[0] ?? null
  );
}

export function getFutureScheduledPublications(
  publications: PublicationResponse[],
  now: Date = new Date(),
): PublicationResponse[] {
  return publications
    .filter(
      (publication) =>
        publication.status === PUBLICATION_STATUS.SCHEDULED &&
        new Date(publication.scheduledAt).getTime() >= now.getTime(),
    )
    .sort(
      (leftPublication, rightPublication) =>
        new Date(leftPublication.scheduledAt).getTime() -
        new Date(rightPublication.scheduledAt).getTime(),
    );
}

export function filterPublications(
  publications: PublicationResponse[],
  statusFilter: PublicationStatusFilter,
  platformFilter: PlatformFilter,
): PublicationResponse[] {
  return publications.filter((publication) => {
    const matchesStatus =
      statusFilter === PUBLICATION_STATUS_FILTER.ALL ||
      publication.status === statusFilter;
    const matchesPlatform =
      platformFilter === PLATFORM_FILTER.ALL ||
      getEnabledPlatforms(publication).includes(platformFilter);

    return matchesStatus && matchesPlatform;
  });
}

export function isPublicationRetryable(publication: PublicationResponse): boolean {
  return (
    publication.status === PUBLICATION_STATUS.FAILED ||
    publication.status === PUBLICATION_STATUS.PARTIAL
  );
}

function findPlatformResult(
  results: PublicationResultResponse[],
  platform: MvpPlatform,
): PublicationResultResponse | undefined {
  return results.find((result) => result.platform === platform);
}

export function buildPlatformStatusRows(
  publication: PublicationResponse,
): PlatformStatusRow[] {
  return getEnabledPlatforms(publication).map((platform) => {
    const result = findPlatformResult(publication.results, platform);

    return {
      platform,
      label: getPlatformLabel(platform),
      status: result?.status ?? PLATFORM_RESULT_STATUS.PENDING,
      resultUrl: result?.resultUrl ?? null,
      errorMessage: result?.errorMessage ?? null,
    };
  });
}
