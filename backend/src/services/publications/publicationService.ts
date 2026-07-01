import {
  Platform as PrismaPlatform,
  PlatformResultStatus as PrismaPlatformResultStatus,
  PublicationStatus as PrismaPublicationStatus,
  Prisma,
} from "@prisma/client";

import { AppError } from "../../api/errors/AppError.js";
import {
  PLATFORM,
  PLATFORM_RESULT_STATUS,
  PUBLICATION_STATUS,
  type Platform,
  type PlatformResultStatus,
  type PublicationStatus,
} from "../../config/constants.js";
import { prisma } from "../../db/prisma.js";
import {
  cancelPublicationJobs,
  calculateRetryDelayMs,
  schedulePublicationJob,
  schedulePublicationRetryJob,
} from "./publicationQueue.js";
import {
  publishPlatform,
  PlatformPublishError,
} from "./platformPublisher.js";
import {
  publicationPlatformSchema,
  type CreatePublicationInput,
  type PublicationPlatformInput,
} from "./publicationSchemas.js";

const PUBLICATION_INCLUDE = {
  results: true,
} as const;

const PRISMA_PLATFORM_BY_API_PLATFORM = {
  [PLATFORM.YOUTUBE]: PrismaPlatform.YOUTUBE,
  [PLATFORM.VK]: PrismaPlatform.VK,
  [PLATFORM.INSTAGRAM]: PrismaPlatform.INSTAGRAM,
  [PLATFORM.THREADS]: PrismaPlatform.THREADS,
  [PLATFORM.TIKTOK]: PrismaPlatform.TIKTOK,
  [PLATFORM.PINTEREST]: PrismaPlatform.PINTEREST,
} as const satisfies Record<Platform, PrismaPlatform>;

const API_PLATFORM_BY_PRISMA_PLATFORM = {
  [PrismaPlatform.YOUTUBE]: PLATFORM.YOUTUBE,
  [PrismaPlatform.VK]: PLATFORM.VK,
  [PrismaPlatform.INSTAGRAM]: PLATFORM.INSTAGRAM,
  [PrismaPlatform.THREADS]: PLATFORM.THREADS,
  [PrismaPlatform.TIKTOK]: PLATFORM.TIKTOK,
  [PrismaPlatform.PINTEREST]: PLATFORM.PINTEREST,
} as const satisfies Record<PrismaPlatform, Platform>;

const API_STATUS_BY_PRISMA_STATUS = {
  [PrismaPublicationStatus.DRAFT]: PUBLICATION_STATUS.DRAFT,
  [PrismaPublicationStatus.SCHEDULED]: PUBLICATION_STATUS.SCHEDULED,
  [PrismaPublicationStatus.PUBLISHING]: PUBLICATION_STATUS.PUBLISHING,
  [PrismaPublicationStatus.PUBLISHED]: PUBLICATION_STATUS.PUBLISHED,
  [PrismaPublicationStatus.PARTIAL]: PUBLICATION_STATUS.PARTIAL,
  [PrismaPublicationStatus.FAILED]: PUBLICATION_STATUS.FAILED,
} as const satisfies Record<PrismaPublicationStatus, PublicationStatus>;

const API_RESULT_STATUS_BY_PRISMA_STATUS = {
  [PrismaPlatformResultStatus.PENDING]: PLATFORM_RESULT_STATUS.PENDING,
  [PrismaPlatformResultStatus.PUBLISHING]: PLATFORM_RESULT_STATUS.PUBLISHING,
  [PrismaPlatformResultStatus.PUBLISHED]: PLATFORM_RESULT_STATUS.PUBLISHED,
  [PrismaPlatformResultStatus.FAILED]: PLATFORM_RESULT_STATUS.FAILED,
  [PrismaPlatformResultStatus.SKIPPED]: PLATFORM_RESULT_STATUS.SKIPPED,
} as const satisfies Record<PrismaPlatformResultStatus, PlatformResultStatus>;

const DELETABLE_PUBLICATION_STATUSES = new Set<PrismaPublicationStatus>([
  PrismaPublicationStatus.DRAFT,
  PrismaPublicationStatus.SCHEDULED,
]);

const RETRYABLE_PUBLICATION_STATUSES = new Set<PrismaPublicationStatus>([
  PrismaPublicationStatus.PARTIAL,
  PrismaPublicationStatus.FAILED,
]);

interface PublicationResultRecord {
  id: string;
  publicationId: string;
  platform: PrismaPlatform;
  status: PrismaPlatformResultStatus;
  externalId: string | null;
  resultUrl: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  rawResponse: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PublicationRecord {
  id: string;
  userId: string;
  videoR2Key: string;
  defaultText: string;
  scheduledAt: Date;
  status: PrismaPublicationStatus;
  platforms: Prisma.JsonValue;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  results?: PublicationResultRecord[];
}

export interface PublicationResultResponse {
  id: string;
  platform: Platform;
  status: PlatformResultStatus;
  externalId: string | null;
  resultUrl: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  rawResponse: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface PublicationResponse {
  id: string;
  userId: string;
  videoR2Key: string;
  defaultText: string;
  scheduledAt: string;
  status: PublicationStatus;
  platforms: unknown;
  metadata: unknown;
  results: PublicationResultResponse[];
  createdAt: string;
  updatedAt: string;
}

interface PublicationMetadata {
  retryCount: number;
  lastRetriedAt?: string;
}

function isJsonObject(value: Prisma.JsonValue | null): value is Prisma.JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRetryCount(metadata: Prisma.JsonValue | null): number {
  if (!isJsonObject(metadata)) {
    return 0;
  }

  const retryCount = metadata.retryCount;

  return typeof retryCount === "number" && Number.isInteger(retryCount)
    ? retryCount
    : 0;
}

function buildMetadata(
  metadata: Prisma.JsonValue | null,
  updates: Partial<PublicationMetadata>,
): Prisma.InputJsonObject {
  const baseMetadata = isJsonObject(metadata) ? metadata : {};

  return {
    ...baseMetadata,
    ...updates,
  };
}

function removeUndefinedValues(
  value: Record<string, Prisma.InputJsonValue | null | undefined>,
): Prisma.InputJsonObject {
  return Object.fromEntries(
    Object.entries(value).filter((entry) => entry[1] !== undefined),
  );
}

function normalizePlatforms(
  platforms: PublicationPlatformInput[],
): Prisma.InputJsonArray {
  return platforms.map((platformSettings) => {
    if (platformSettings.platform === PLATFORM.THREADS) {
      return {
        platform: platformSettings.platform,
        enabled: platformSettings.enabled,
      };
    }

    if (platformSettings.platform === PLATFORM.PINTEREST) {
      return removeUndefinedValues({
        platform: platformSettings.platform,
        enabled: platformSettings.enabled,
        title: platformSettings.title,
        text: platformSettings.text,
        board_id: platformSettings.board_id,
      });
    }

    if (platformSettings.platform === PLATFORM.YOUTUBE) {
      return removeUndefinedValues({
        platform: platformSettings.platform,
        enabled: platformSettings.enabled,
        title: platformSettings.title,
        text: platformSettings.text,
      });
    }

    return removeUndefinedValues({
      platform: platformSettings.platform,
      enabled: platformSettings.enabled,
      text: platformSettings.text,
    });
  });
}

function parseStoredPlatforms(value: Prisma.JsonValue): PublicationPlatformInput[] {
  const result = publicationPlatformSchema.array().safeParse(value);

  return result.success ? result.data : [];
}

function getEnabledPlatforms(value: Prisma.JsonValue): Platform[] {
  return parseStoredPlatforms(value)
    .filter((platformSettings) => platformSettings.enabled)
    .map((platformSettings) => platformSettings.platform);
}

export function resolvePlatformText(
  platforms: PublicationPlatformInput[],
  platform: Platform,
  defaultText: string,
): string {
  if (platform === PLATFORM.THREADS) {
    const instagramSettings = platforms.find(
      (platformSettings) => platformSettings.platform === PLATFORM.INSTAGRAM,
    );

    if (
      instagramSettings !== undefined &&
      "text" in instagramSettings &&
      instagramSettings.text !== undefined &&
      instagramSettings.text !== null
    ) {
      return instagramSettings.text;
    }

    return defaultText;
  }

  const platformSettings = platforms.find(
    (settings) => settings.platform === platform,
  );

  if (
    platformSettings !== undefined &&
    "text" in platformSettings &&
    platformSettings.text !== undefined &&
    platformSettings.text !== null
  ) {
    return platformSettings.text;
  }

  return defaultText;
}

function serializeResult(
  result: PublicationResultRecord,
): PublicationResultResponse {
  return {
    id: result.id,
    platform: API_PLATFORM_BY_PRISMA_PLATFORM[result.platform],
    status: API_RESULT_STATUS_BY_PRISMA_STATUS[result.status],
    externalId: result.externalId,
    resultUrl: result.resultUrl,
    errorCode: result.errorCode,
    errorMessage: result.errorMessage,
    rawResponse: result.rawResponse,
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  };
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  if (value === undefined) {
    return {};
  }

  return value as Prisma.InputJsonValue;
}

function normalizeResultError(error: unknown): {
  errorCode: string;
  errorMessage: string;
  rawResponse: Prisma.InputJsonValue;
} {
  if (error instanceof PlatformPublishError) {
    return {
      errorCode: error.code,
      errorMessage: error.message,
      rawResponse: toPrismaJson(error.rawResponse),
    };
  }

  if (error instanceof AppError) {
    return {
      errorCode: error.code,
      errorMessage: error.message,
      rawResponse: {},
    };
  }

  if (error instanceof Error) {
    return {
      errorCode: "PlatformPublishFailed",
      errorMessage: error.message,
      rawResponse: {},
    };
  }

  return {
    errorCode: "PlatformPublishFailed",
    errorMessage: "Platform publish failed",
    rawResponse: {},
  };
}

async function publishPublicationPlatform(
  publication: PublicationRecord,
  platforms: PublicationPlatformInput[],
  platform: Platform,
): Promise<void> {
  const prismaPlatform = PRISMA_PLATFORM_BY_API_PLATFORM[platform];

  await prisma.publicationResult.upsert({
    where: {
      publicationId_platform: {
        publicationId: publication.id,
        platform: prismaPlatform,
      },
    },
    create: {
      publicationId: publication.id,
      platform: prismaPlatform,
      status: PrismaPlatformResultStatus.PUBLISHING,
    },
    update: {
      status: PrismaPlatformResultStatus.PUBLISHING,
      externalId: null,
      resultUrl: null,
      errorCode: null,
      errorMessage: null,
      rawResponse: Prisma.JsonNull,
    },
  });

  try {
    const result = await publishPlatform({
      publicationId: publication.id,
      userId: publication.userId,
      videoR2Key: publication.videoR2Key,
      defaultText: publication.defaultText,
      platforms,
      platform,
    });

    await prisma.publicationResult.update({
      where: {
        publicationId_platform: {
          publicationId: publication.id,
          platform: prismaPlatform,
        },
      },
      data: {
        status:
          result.outcome === "published"
            ? PrismaPlatformResultStatus.PUBLISHED
            : PrismaPlatformResultStatus.SKIPPED,
        externalId: result.externalId,
        resultUrl: result.resultUrl,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        rawResponse: toPrismaJson(result.rawResponse),
      },
    });
  } catch (error) {
    const resultError = normalizeResultError(error);

    await prisma.publicationResult.update({
      where: {
        publicationId_platform: {
          publicationId: publication.id,
          platform: prismaPlatform,
        },
      },
      data: {
        status: PrismaPlatformResultStatus.FAILED,
        externalId: null,
        resultUrl: null,
        errorCode: resultError.errorCode,
        errorMessage: resultError.errorMessage,
        rawResponse: resultError.rawResponse,
      },
    });
  }
}

export function serializePublication(
  publication: PublicationRecord,
): PublicationResponse {
  return {
    id: publication.id,
    userId: publication.userId,
    videoR2Key: publication.videoR2Key,
    defaultText: publication.defaultText,
    scheduledAt: publication.scheduledAt.toISOString(),
    status: API_STATUS_BY_PRISMA_STATUS[publication.status],
    platforms: publication.platforms,
    metadata: publication.metadata,
    results: publication.results?.map(serializeResult) ?? [],
    createdAt: publication.createdAt.toISOString(),
    updatedAt: publication.updatedAt.toISOString(),
  };
}

export async function createPublication(
  input: CreatePublicationInput,
  userId: string,
): Promise<PublicationResponse> {
  const scheduledAt = new Date(input.scheduledAt);
  const publication = await prisma.publication.create({
    data: {
      userId,
      videoR2Key: input.videoR2Key,
      defaultText: input.defaultText,
      scheduledAt,
      status: PrismaPublicationStatus.SCHEDULED,
      platforms: normalizePlatforms(input.platforms),
      metadata: {
        retryCount: 0,
      },
    },
    include: PUBLICATION_INCLUDE,
  });

  await schedulePublicationJob(
    {
      publicationId: publication.id,
      userId,
    },
    scheduledAt,
  );

  return serializePublication(publication);
}

export async function listPublications(
  userId: string,
): Promise<PublicationResponse[]> {
  const publications = await prisma.publication.findMany({
    where: {
      userId,
    },
    orderBy: {
      scheduledAt: "desc",
    },
    include: PUBLICATION_INCLUDE,
  });

  return publications.map(serializePublication);
}

export async function getPublication(
  userId: string,
  publicationId: string,
): Promise<PublicationResponse> {
  const publication = await prisma.publication.findFirst({
    where: {
      id: publicationId,
      userId,
    },
    include: PUBLICATION_INCLUDE,
  });

  if (publication === null) {
    throw new AppError(404, "PublicationNotFound", "Publication not found");
  }

  return serializePublication(publication);
}

export async function retryPublication(
  userId: string,
  publicationId: string,
): Promise<PublicationResponse> {
  const publication = await prisma.publication.findFirst({
    where: {
      id: publicationId,
      userId,
    },
    include: PUBLICATION_INCLUDE,
  });

  if (publication === null) {
    throw new AppError(404, "PublicationNotFound", "Publication not found");
  }

  if (!RETRYABLE_PUBLICATION_STATUSES.has(publication.status)) {
    throw new AppError(
      409,
      "PublicationNotRetryable",
      "Only failed or partially published publications can be retried",
    );
  }

  const retryCount = getRetryCount(publication.metadata);
  const retryDelay = calculateRetryDelayMs(retryCount);

  if (retryDelay === null) {
    throw new AppError(
      409,
      "PublicationRetryExhausted",
      "Publication retry policy is exhausted",
    );
  }

  const updatedPublication = await prisma.publication.update({
    where: {
      id: publication.id,
    },
    data: {
      status: PrismaPublicationStatus.SCHEDULED,
      metadata: buildMetadata(publication.metadata, {
        retryCount: retryCount + 1,
        lastRetriedAt: new Date().toISOString(),
      }),
    },
    include: PUBLICATION_INCLUDE,
  });

  await schedulePublicationRetryJob(
    {
      publicationId: publication.id,
      userId,
    },
    retryCount,
  );

  return serializePublication(updatedPublication);
}

export async function deletePublication(
  userId: string,
  publicationId: string,
): Promise<void> {
  const publication = await prisma.publication.findFirst({
    where: {
      id: publicationId,
      userId,
    },
  });

  if (publication === null) {
    throw new AppError(404, "PublicationNotFound", "Publication not found");
  }

  if (!DELETABLE_PUBLICATION_STATUSES.has(publication.status)) {
    throw new AppError(
      409,
      "PublicationCannotBeDeleted",
      "Only draft or scheduled publications can be deleted",
    );
  }

  await cancelPublicationJobs(publication.id);
  await prisma.publication.delete({
    where: {
      id: publication.id,
    },
  });
}

export async function processPublicationJob(
  publicationId: string,
): Promise<void> {
  const publication = await prisma.publication.findUnique({
    where: {
      id: publicationId,
    },
  });

  if (publication === null || publication.status === PrismaPublicationStatus.PUBLISHED) {
    return;
  }

  const enabledPlatforms = getEnabledPlatforms(publication.platforms);
  const platformSettings = parseStoredPlatforms(publication.platforms);

  await prisma.publication.update({
    where: {
      id: publication.id,
    },
    data: {
      status: PrismaPublicationStatus.PUBLISHING,
    },
  });

  await Promise.all(
    enabledPlatforms.map((platform) =>
      prisma.publicationResult.upsert({
        where: {
          publicationId_platform: {
            publicationId: publication.id,
            platform: PRISMA_PLATFORM_BY_API_PLATFORM[platform],
          },
        },
        create: {
          publicationId: publication.id,
          platform: PRISMA_PLATFORM_BY_API_PLATFORM[platform],
          status: PrismaPlatformResultStatus.PENDING,
        },
        update: {
          status: PrismaPlatformResultStatus.PENDING,
          errorCode: null,
          errorMessage: null,
        },
      }),
    ),
  );

  await Promise.allSettled(
    enabledPlatforms.map((platform) =>
      publishPublicationPlatform(publication, platformSettings, platform),
    ),
  );

  await aggregatePublicationStatus(publication.id);
}

export async function aggregatePublicationStatus(
  publicationId: string,
): Promise<PublicationStatus> {
  const publication = await prisma.publication.findUnique({
    where: {
      id: publicationId,
    },
    include: PUBLICATION_INCLUDE,
  });

  if (publication === null) {
    throw new AppError(404, "PublicationNotFound", "Publication not found");
  }

  const enabledPlatforms = getEnabledPlatforms(publication.platforms);
  const relevantResults = publication.results.filter((result) =>
    enabledPlatforms.includes(API_PLATFORM_BY_PRISMA_PLATFORM[result.platform]),
  );
  const hasPublishedResult = relevantResults.some(
    (result) => result.status === PrismaPlatformResultStatus.PUBLISHED,
  );
  const hasFailedResult = relevantResults.some(
    (result) => result.status === PrismaPlatformResultStatus.FAILED,
  );
  const hasSkippedResult = relevantResults.some(
    (result) => result.status === PrismaPlatformResultStatus.SKIPPED,
  );
  const allFinished =
    relevantResults.length === enabledPlatforms.length &&
    relevantResults.every(
      (result) =>
        result.status === PrismaPlatformResultStatus.PUBLISHED ||
        result.status === PrismaPlatformResultStatus.FAILED ||
        result.status === PrismaPlatformResultStatus.SKIPPED,
    );

  let nextStatus: PrismaPublicationStatus = PrismaPublicationStatus.PUBLISHING;

  if (
    allFinished &&
    hasPublishedResult &&
    (hasFailedResult || hasSkippedResult)
  ) {
    nextStatus = PrismaPublicationStatus.PARTIAL;
  } else if (allFinished && hasPublishedResult) {
    nextStatus = PrismaPublicationStatus.PUBLISHED;
  } else if (allFinished && hasFailedResult) {
    nextStatus = PrismaPublicationStatus.FAILED;
  } else if (allFinished && hasSkippedResult) {
    nextStatus = PrismaPublicationStatus.FAILED;
  }

  await prisma.publication.update({
    where: {
      id: publication.id,
    },
    data: {
      status: nextStatus,
    },
  });

  return API_STATUS_BY_PRISMA_STATUS[nextStatus];
}
