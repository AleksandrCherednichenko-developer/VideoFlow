import { AppError } from "../../api/errors/AppError.js";

const VK_API_VERSION = "5.199";
const VK_API_BASE_URL = "https://api.vk.com/method";

export interface VkVideoSaveInput {
  accessToken: string;
  name: string;
  description: string;
}

export interface VkVideoSaveResult {
  uploadUrl: string;
  ownerId: number;
  videoId: number;
  rawResponse: unknown;
}

export interface VkUploadVideoInput {
  uploadUrl: string;
  video: Buffer;
  filename: string;
  contentType: string;
}

export interface VkUploadVideoResult {
  rawResponse: unknown;
}

export interface VkCreateWallPostInput {
  accessToken: string;
  ownerId: number;
  message: string;
  videoId?: number;
}

export interface VkGroupInfo {
  id: number;
  name: string;
  screenName: string | null;
  rawResponse: unknown;
}

export interface VkCreateWallPostResult {
  postId: number;
  rawResponse: unknown;
}

export interface VkPublishRawResponse {
  videoSave: unknown;
  upload: unknown;
  wallPost: unknown;
}

export class VkApiError extends AppError {
  public readonly rawResponse: unknown;

  public constructor(code: string, message: string, rawResponse?: unknown) {
    super(502, code, message);
    this.rawResponse = rawResponse;
  }
}

interface VkApiEnvelope {
  response?: unknown;
  error?: {
    error_code?: number;
    error_msg?: string;
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readNumberField(value: Record<string, unknown>, field: string): number {
  const fieldValue = value[field];

  if (typeof fieldValue !== "number") {
    throw new VkApiError(
      "VkInvalidResponse",
      `VK response is missing numeric field ${field}`,
      value,
    );
  }

  return fieldValue;
}

function readStringField(value: Record<string, unknown>, field: string): string {
  const fieldValue = value[field];

  if (typeof fieldValue !== "string" || fieldValue.length === 0) {
    throw new VkApiError(
      "VkInvalidResponse",
      `VK response is missing string field ${field}`,
      value,
    );
  }

  return fieldValue;
}

async function readJson(response: Response, errorCode: string): Promise<unknown> {
  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    throw new VkApiError(errorCode, "VK request failed", responseBody);
  }

  if (
    isObject(responseBody) &&
    "error" in responseBody &&
    isObject(responseBody.error)
  ) {
    const envelope = responseBody as VkApiEnvelope;

    throw new VkApiError(
      errorCode,
      envelope.error?.error_msg ?? "VK API returned an error",
      responseBody,
    );
  }

  return responseBody;
}

function getVkResponseObject(responseBody: unknown, errorCode: string) {
  if (!isObject(responseBody) || !isObject(responseBody.response)) {
    throw new VkApiError(
      "VkInvalidResponse",
      "VK response envelope is invalid",
      responseBody,
    );
  }

  return responseBody.response;
}

export function buildVkVideoUrl(ownerId: number, videoId: number): string {
  return `https://vk.com/video${ownerId}_${videoId}`;
}

export function buildVkWallPostUrl(groupId: number, postId: number): string {
  return `https://vk.com/wall-${groupId}_${postId}`;
}

export function buildVkVideoAttachment(ownerId: number, videoId: number): string {
  return `video${ownerId}_${videoId}`;
}

export async function saveVideo(
  input: VkVideoSaveInput,
): Promise<VkVideoSaveResult> {
  const body = new URLSearchParams({
    access_token: input.accessToken,
    v: VK_API_VERSION,
    name: input.name,
    description: input.description,
    wallpost: "0",
  });
  const response = await fetch(`${VK_API_BASE_URL}/video.save`, {
    method: "POST",
    body,
  });
  const responseBody = await readJson(response, "VkVideoSaveFailed");
  const payload = getVkResponseObject(responseBody, "VkVideoSaveFailed");

  return {
    uploadUrl: readStringField(payload, "upload_url"),
    ownerId: readNumberField(payload, "owner_id"),
    videoId: readNumberField(payload, "video_id"),
    rawResponse: responseBody,
  };
}

export async function uploadVideo(
  input: VkUploadVideoInput,
): Promise<VkUploadVideoResult> {
  const formData = new FormData();
  const videoBlob = new Blob([new Uint8Array(input.video)], {
    type: input.contentType,
  });
  formData.append("video_file", videoBlob, input.filename);

  const response = await fetch(input.uploadUrl, {
    method: "POST",
    body: formData,
  });
  const responseBody = await readJson(response, "VkUploadFailed");

  return {
    rawResponse: responseBody,
  };
}

export async function getGroupById(
  accessToken: string,
  groupId: string,
): Promise<VkGroupInfo> {
  const body = new URLSearchParams({
    access_token: accessToken,
    v: VK_API_VERSION,
    group_id: groupId,
  });
  const response = await fetch(`${VK_API_BASE_URL}/groups.getById`, {
    method: "POST",
    body,
  });
  const responseBody = await readJson(response, "VkGroupLookupFailed");
  const payload = getVkResponseObject(responseBody, "VkGroupLookupFailed");

  if (!Array.isArray(payload) || payload.length === 0) {
    throw new VkApiError(
      "VkGroupLookupFailed",
      "VK group lookup returned no groups",
      responseBody,
    );
  }

  const group = payload[0];

  if (!isObject(group)) {
    throw new VkApiError(
      "VkGroupLookupFailed",
      "VK group lookup returned an invalid group",
      responseBody,
    );
  }

  const id = readNumberField(group, "id");
  const name = readStringField(group, "name");
  const screenNameValue = group.screen_name;

  return {
    id,
    name,
    screenName:
      typeof screenNameValue === "string" && screenNameValue.length > 0
        ? screenNameValue
        : null,
    rawResponse: responseBody,
  };
}

export async function createWallPost(
  input: VkCreateWallPostInput,
): Promise<VkCreateWallPostResult> {
  const body = new URLSearchParams({
    access_token: input.accessToken,
    v: VK_API_VERSION,
    owner_id: input.ownerId.toString(),
    message: input.message,
  });

  if (input.videoId !== undefined) {
    body.set(
      "attachments",
      buildVkVideoAttachment(input.ownerId, input.videoId),
    );
  }
  const response = await fetch(`${VK_API_BASE_URL}/wall.post`, {
    method: "POST",
    body,
  });
  const responseBody = await readJson(response, "VkWallPostFailed");
  const payload = getVkResponseObject(responseBody, "VkWallPostFailed");

  return {
    postId: readNumberField(payload, "post_id"),
    rawResponse: responseBody,
  };
}
