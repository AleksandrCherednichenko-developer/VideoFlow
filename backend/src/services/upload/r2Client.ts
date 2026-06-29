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

function normalizeRequiredR2Value(value: string | undefined): string | null {
  const normalizedValue = value?.trim();

  if (normalizedValue === undefined || normalizedValue.length === 0) {
    return null;
  }

  return normalizedValue;
}

export function getR2Config(): R2Config {
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY,
    R2_SECRET_KEY,
    R2_BUCKET,
    R2_PUBLIC_URL,
  } = env;

  const accountId = normalizeRequiredR2Value(R2_ACCOUNT_ID);
  const accessKeyId = normalizeRequiredR2Value(R2_ACCESS_KEY);
  const secretAccessKey = normalizeRequiredR2Value(R2_SECRET_KEY);
  const bucket = normalizeRequiredR2Value(R2_BUCKET);

  if (
    accountId === null ||
    accessKeyId === null ||
    secretAccessKey === null ||
    bucket === null
  ) {
    throw new AppError(
      503,
      "StorageUnavailable",
      "Cloudflare R2 storage is not configured",
    );
  }

  const config: R2Config = {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
  };

  const publicUrl = R2_PUBLIC_URL?.trim();

  if (publicUrl !== undefined && publicUrl.length > 0) {
    config.publicUrl = publicUrl.replace(/\/$/, "");
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
