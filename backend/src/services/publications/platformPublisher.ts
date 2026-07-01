import { AppError } from "../../api/errors/AppError.js";
import { PLATFORM, type Platform } from "../../config/constants.js";
import {
  buildVkVideoUrl,
  createWallPost,
  saveVideo,
  uploadVideo,
  VkApiError,
} from "../../platforms/vk/vkClient.js";
import { getActivePlatformAccountSecret } from "../oauth/accountService.js";
import {
  createR2Client,
  getObjectBuffer,
  getObjectMetadata,
  getR2Config,
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

function getFilenameFromR2Key(videoR2Key: string): string {
  return videoR2Key.split("/").at(-1) ?? "video.mp4";
}

function normalizeContentType(contentType: string | undefined): string {
  return contentType ?? "video/mp4";
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

async function downloadVideo(input: {
  videoR2Key: string;
}): Promise<{
  buffer: Buffer;
  filename: string;
  contentType: string;
}> {
  const config = getR2Config();
  const client = createR2Client(config);
  const [metadata, buffer] = await Promise.all([
    getObjectMetadata(client, config.bucket, input.videoR2Key),
    getObjectBuffer(client, config.bucket, input.videoR2Key),
  ]);

  if (metadata === null || buffer === null) {
    throw new PlatformPublishError(
      "UploadNotFound",
      "Uploaded video was not found in storage",
    );
  }

  return {
    buffer,
    filename: getFilenameFromR2Key(input.videoR2Key),
    contentType: normalizeContentType(metadata.contentType),
  };
}

export async function publishVk(
  input: PlatformPublishInput,
): Promise<PlatformPublishResult> {
  try {
    const account = await getActivePlatformAccountSecret(input.userId, PLATFORM.VK);
    const video = await downloadVideo({
      videoR2Key: input.videoR2Key,
    });
    const description = resolvePublishText(
      input.platforms,
      PLATFORM.VK,
      input.defaultText,
    );
    const savedVideo = await saveVideo({
      accessToken: account.accessToken,
      name: `VideoFlow publication ${input.publicationId}`,
      description,
    });
    const uploadedVideo = await uploadVideo({
      uploadUrl: savedVideo.uploadUrl,
      video: video.buffer,
      filename: video.filename,
      contentType: video.contentType,
    });
    const wallPost = await createWallPost({
      accessToken: account.accessToken,
      ownerId: savedVideo.ownerId,
      videoId: savedVideo.videoId,
      message: description,
    });
    const externalId = `${savedVideo.ownerId}_${savedVideo.videoId}`;

    return {
      outcome: PLATFORM_PUBLISH_OUTCOME.PUBLISHED,
      externalId,
      resultUrl: buildVkVideoUrl(savedVideo.ownerId, savedVideo.videoId),
      rawResponse: {
        videoSave: savedVideo.rawResponse,
        upload: uploadedVideo.rawResponse,
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
