import crypto from "node:crypto";

import { AppError } from "../../api/errors/AppError.js";
import {
  buildPublicUrl,
  createPresignedPutUrl,
  createR2Client,
  getObjectMetadata,
  getR2Config,
} from "./r2Client.js";
import {
  ALLOWED_VIDEO_CONTENT_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
  PRESIGN_URL_EXPIRES_SECONDS,
  type CompleteUploadInput,
  type PresignUploadInput,
} from "./uploadSchemas.js";

const ALLOWED_EXTENSIONS = ["mp4", "mov", "webm"] as const;

const EXTENSION_BY_CONTENT_TYPE: Record<
  (typeof ALLOWED_VIDEO_CONTENT_TYPES)[number],
  (typeof ALLOWED_EXTENSIONS)[number]
> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export interface PresignedUploadResult {
  videoR2Key: string;
  uploadUrl: string;
  expiresAt: string;
  headers: {
    "Content-Type": string;
  };
}

export interface CompletedUploadResult {
  videoR2Key: string;
  sizeBytes: number;
  contentType?: string;
  publicUrl?: string;
}

export function buildVideoR2Key(userId: string, extension: string): string {
  return `users/${userId}/uploads/${crypto.randomUUID()}.${extension}`;
}

export function assertUserOwnsUploadKey(
  userId: string,
  videoR2Key: string,
): void {
  const expectedPrefix = `users/${userId}/uploads/`;

  if (!videoR2Key.startsWith(expectedPrefix)) {
    throw new AppError(
      403,
      "InvalidUploadKey",
      "Upload key does not belong to this user",
    );
  }
}

function extractSafeExtension(
  filename: string,
  contentType: PresignUploadInput["contentType"],
): string {
  const extensionMatch = filename.match(/\.([a-zA-Z0-9]+)$/);

  if (extensionMatch?.[1] !== undefined) {
    const extension = extensionMatch[1].toLowerCase();

    if (ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])) {
      return extension;
    }
  }

  return EXTENSION_BY_CONTENT_TYPE[contentType];
}

function mapStorageError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError(
    503,
    "StorageUnavailable",
    "Cloudflare R2 storage request failed",
  );
}

function isAllowedVideoContentType(
  contentType: string,
): contentType is (typeof ALLOWED_VIDEO_CONTENT_TYPES)[number] {
  return ALLOWED_VIDEO_CONTENT_TYPES.includes(
    contentType as (typeof ALLOWED_VIDEO_CONTENT_TYPES)[number],
  );
}

export async function createPresignedUpload(
  input: PresignUploadInput,
  userId: string,
): Promise<PresignedUploadResult> {
  try {
    const config = getR2Config();
    const client = createR2Client(config);
    const extension = extractSafeExtension(input.filename, input.contentType);
    const videoR2Key = buildVideoR2Key(userId, extension);
    const expiresAt = new Date(
      Date.now() + PRESIGN_URL_EXPIRES_SECONDS * 1000,
    ).toISOString();
    const uploadUrl = await createPresignedPutUrl(
      client,
      config.bucket,
      videoR2Key,
      input.contentType,
      PRESIGN_URL_EXPIRES_SECONDS,
    );

    return {
      videoR2Key,
      uploadUrl,
      expiresAt,
      headers: {
        "Content-Type": input.contentType,
      },
    };
  } catch (error) {
    throw mapStorageError(error);
  }
}

export async function completeUpload(
  input: CompleteUploadInput,
  userId: string,
): Promise<CompletedUploadResult> {
  assertUserOwnsUploadKey(userId, input.videoR2Key);

  try {
    const config = getR2Config();
    const client = createR2Client(config);
    const metadata = await getObjectMetadata(
      client,
      config.bucket,
      input.videoR2Key,
    );

    if (metadata === null) {
      throw new AppError(
        404,
        "UploadNotFound",
        "Uploaded video was not found in storage",
      );
    }

    if (metadata.sizeBytes <= 0) {
      throw new AppError(
        422,
        "UploadVerificationFailed",
        "Uploaded video is empty or invalid",
      );
    }

    if (metadata.sizeBytes > MAX_UPLOAD_SIZE_BYTES) {
      throw new AppError(
        422,
        "UploadVerificationFailed",
        "Uploaded video exceeds the maximum allowed size",
      );
    }

    if (
      metadata.contentType !== undefined &&
      !isAllowedVideoContentType(metadata.contentType)
    ) {
      throw new AppError(
        422,
        "UploadVerificationFailed",
        "Uploaded video content type is not supported",
      );
    }

    const publicUrl = buildPublicUrl(config, input.videoR2Key);

    return {
      videoR2Key: input.videoR2Key,
      sizeBytes: metadata.sizeBytes,
      ...(metadata.contentType !== undefined
        ? { contentType: metadata.contentType }
        : {}),
      ...(publicUrl !== undefined ? { publicUrl } : {}),
    };
  } catch (error) {
    throw mapStorageError(error);
  }
}
