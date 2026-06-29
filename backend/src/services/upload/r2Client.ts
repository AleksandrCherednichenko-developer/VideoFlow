import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { AppError } from "../../api/errors/AppError.js";
import { env } from "../../config/env.js";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl?: string;
}

export interface ObjectMetadata {
  sizeBytes: number;
  contentType?: string;
}

export function getR2Config(): R2Config {
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY,
    R2_SECRET_KEY,
    R2_BUCKET,
    R2_PUBLIC_URL,
  } = env;

  if (
    R2_ACCOUNT_ID === undefined ||
    R2_ACCESS_KEY === undefined ||
    R2_SECRET_KEY === undefined ||
    R2_BUCKET === undefined
  ) {
    throw new AppError(
      503,
      "StorageUnavailable",
      "Cloudflare R2 storage is not configured",
    );
  }

  const config: R2Config = {
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
    bucket: R2_BUCKET,
  };

  if (R2_PUBLIC_URL !== undefined && R2_PUBLIC_URL.length > 0) {
    config.publicUrl = R2_PUBLIC_URL.replace(/\/$/, "");
  }

  return config;
}

export function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export function buildPublicUrl(config: R2Config, key: string): string | undefined {
  if (config.publicUrl === undefined) {
    return undefined;
  }

  return `${config.publicUrl}/${key}`;
}

export async function createPresignedPutUrl(
  client: S3Client,
  bucket: string,
  key: string,
  contentType: string,
  expiresIn: number,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}

function isNotFoundError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if ("name" in error && error.name === "NotFound") {
    return true;
  }

  if (
    "$metadata" in error &&
    typeof error.$metadata === "object" &&
    error.$metadata !== null &&
    "httpStatusCode" in error.$metadata &&
    error.$metadata.httpStatusCode === 404
  ) {
    return true;
  }

  return false;
}

export async function getObjectMetadata(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<ObjectMetadata | null> {
  try {
    const response = await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    return {
      sizeBytes: response.ContentLength ?? 0,
      ...(response.ContentType !== undefined
        ? { contentType: response.ContentType }
        : {}),
    };
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }

    throw error;
  }
}
