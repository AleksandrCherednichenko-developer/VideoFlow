import { AppError } from "../../api/errors/AppError.js";
import { PLATFORM, type Platform } from "../../config/constants.js";
import {
  buildVkWallPostUrl,
  createWallPost,
  VkApiError,
} from "../../platforms/vk/vkClient.js";
import { getActivePlatformAccountSecret } from "../oauth/accountService.js";
import {
  buildPublicUrl,
  createPresignedGetUrl,
  createR2Client,
  getR2Config,
  PRESIGNED_GET_URL_MAX_EXPIRES_SECONDS,
} from "../upload/r2Client.js";
import type { PublicationPlatformInput } from "./publicationSchemas.js";

export const PLATFORM_PUBLISH_OUTCOME = {
  PUBLISHED: "published",
  SKIPPED: "skipped",
} as const;

export type PlatformPublishOutcome =
  (typeof PLATFORM_PUBLISH_OUTCOME)[keyof typeof PLATFORM_PUBLISH_OUTCOME];

export interface PlatformPublishInput {
  publicationId: string;
  userId: string;
  videoR2Key: string;
  defaultText: string;
  platforms: PublicationPlatformInput[];
  platform: Platform;
}

export interface PlatformPublishResult {
  outcome: PlatformPublishOutcome;
  externalId: string | null;
  resultUrl: string | null;
  rawResponse: unknown;
  errorCode: string | null;
  errorMessage: string | null;
}

export class PlatformPublishError extends Error {
  public readonly code: string;
  public readonly rawResponse: unknown;

  public constructor(code: string, message: string, rawResponse?: unknown) {
    super(message);
    this.code = code;
    this.rawResponse = rawResponse;
  }
}

function resolvePublishText(
  platforms: PublicationPlatformInput[],
  platform: Platform,
  defaultText: string,
): string {
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

function mapAccountError(error: AppError): PlatformPublishError {
  if (error.code === "PlatformAccountNotConnected") {
    return new PlatformPublishError(
      "VkAccountNotConnected",
      "VK account is not connected",
    );
  }

  if (error.code === "PlatformAccountExpired") {
    return new PlatformPublishError("VkTokenExpired", "VK token expired");
  }

  if (error.code === "PlatformAccountInactive") {
    return new PlatformPublishError(
      "VkAccountNotConnected",
      "VK account is inactive",
    );
  }

  return new PlatformPublishError(error.code, error.message);
}

function normalizePublishError(error: unknown): PlatformPublishError {
  if (error instanceof PlatformPublishError) {
    return error;
  }

  if (error instanceof VkApiError) {
    return new PlatformPublishError(error.code, error.message, error.rawResponse);
  }

  if (error instanceof AppError) {
    return mapAccountError(error);
  }

  if (error instanceof Error) {
    return new PlatformPublishError("PlatformPublishFailed", error.message);
  }

  return new PlatformPublishError(
    "PlatformPublishFailed",
    "Platform publish failed",
  );
}

async function resolveVideoLink(videoR2Key: string): Promise<string> {
  const config = getR2Config();
  const publicUrl = buildPublicUrl(config, videoR2Key);

  if (publicUrl !== undefined) {
    return publicUrl;
  }

  const client = createR2Client(config);
  const presignedUrl = await createPresignedGetUrl(
    client,
    config.bucket,
    videoR2Key,
    PRESIGNED_GET_URL_MAX_EXPIRES_SECONDS,
  );

  console.warn(
    "R2_PUBLIC_URL is not configured; using a temporary presigned video link for VK publish",
    {
      videoR2Key,
      expiresInSeconds: PRESIGNED_GET_URL_MAX_EXPIRES_SECONDS,
    },
  );

  return presignedUrl;
}

function parseVkGroupId(externalAccountId: string | null): number {
  if (externalAccountId === null || externalAccountId.length === 0) {
    throw new PlatformPublishError(
      "VkAccountNotConnected",
      "VK community group ID is missing",
    );
  }

  const groupId = Number(externalAccountId);

  if (!Number.isInteger(groupId) || groupId <= 0) {
    throw new PlatformPublishError(
      "VkInvalidGroupId",
      "VK community group ID is invalid",
    );
  }

  return groupId;
}

export async function publishVk(
  input: PlatformPublishInput,
): Promise<PlatformPublishResult> {
  try {
    const account = await getActivePlatformAccountSecret(input.userId, PLATFORM.VK);
    const groupId = parseVkGroupId(account.externalAccountId);
    const description = resolvePublishText(
      input.platforms,
      PLATFORM.VK,
      input.defaultText,
    );
    const videoLink = await resolveVideoLink(input.videoR2Key);
    const message =
      description.length > 0
        ? `${description}\n\n${videoLink}`
        : videoLink;
    const wallPost = await createWallPost({
      accessToken: account.accessToken,
      ownerId: -groupId,
      message,
    });
    const externalId = `-${groupId}_${wallPost.postId}`;

    return {
      outcome: PLATFORM_PUBLISH_OUTCOME.PUBLISHED,
      externalId,
      resultUrl: buildVkWallPostUrl(groupId, wallPost.postId),
      rawResponse: {
        publishMode: "wall_link",
        videoLink,
        wallPost: wallPost.rawResponse,
        postId: wallPost.postId,
      },
      errorCode: null,
      errorMessage: null,
    };
  } catch (error) {
    throw normalizePublishError(error);
  }
}

export async function publishPlatform(
  input: PlatformPublishInput,
): Promise<PlatformPublishResult> {
  if (input.platform === PLATFORM.VK) {
    return publishVk(input);
  }

  return {
    outcome: PLATFORM_PUBLISH_OUTCOME.SKIPPED,
    externalId: null,
    resultUrl: null,
    rawResponse: {
      platform: input.platform,
    },
    errorCode: "PlatformWorkerNotImplemented",
    errorMessage: "Platform worker is not implemented yet",
  };
}
