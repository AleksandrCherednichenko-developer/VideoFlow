import type { Platform } from "../../config/constants.js";
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

export async function publishPlatform(
  input: PlatformPublishInput,
): Promise<PlatformPublishResult> {
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
