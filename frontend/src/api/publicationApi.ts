import { httpClient } from "./httpClient";

export const PUBLICATION_STATUS = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  PUBLISHING: "publishing",
  PUBLISHED: "published",
  PARTIAL: "partial",
  FAILED: "failed",
} as const;

export type PublicationStatus =
  (typeof PUBLICATION_STATUS)[keyof typeof PUBLICATION_STATUS];

export const PLATFORM = {
  YOUTUBE: "youtube",
  VK: "vk",
} as const;

export type MvpPlatform = (typeof PLATFORM)[keyof typeof PLATFORM];

export interface YouTubePlatformPayload {
  platform: typeof PLATFORM.YOUTUBE;
  enabled: boolean;
  title?: string;
  text?: string | null;
}

export interface VkPlatformPayload {
  platform: typeof PLATFORM.VK;
  enabled: boolean;
  text?: string | null;
}

export type PublicationPlatformPayload =
  | YouTubePlatformPayload
  | VkPlatformPayload;

export interface CreatePublicationRequest {
  videoR2Key: string;
  defaultText: string;
  scheduledAt: string;
  platforms: PublicationPlatformPayload[];
}

export interface PublicationResultResponse {
  id: string;
  platform: string;
  status: string;
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
  platforms: PublicationPlatformPayload[];
  metadata: unknown;
  results: PublicationResultResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePublicationResponse {
  publication: PublicationResponse;
}

export async function createPublication(
  request: CreatePublicationRequest,
): Promise<CreatePublicationResponse> {
  const response = await httpClient.post<CreatePublicationResponse>(
    "/publications",
    request,
  );

  return response.data;
}

export interface GetPublicationResponse {
  publication: PublicationResponse;
}

export async function getPublication(
  publicationId: string,
): Promise<GetPublicationResponse> {
  const response = await httpClient.get<GetPublicationResponse>(
    `/publications/${publicationId}`,
  );

  return response.data;
}
