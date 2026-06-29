import axios, { type AxiosProgressEvent } from "axios";

import { httpClient } from "./httpClient";

export interface PresignUploadRequest {
  filename: string;
  contentType: string;
  sizeBytes: number;
}

export interface PresignUploadResponse {
  videoR2Key: string;
  uploadUrl: string;
  expiresAt: string;
  headers: {
    "Content-Type": string;
  };
}

export interface CompleteUploadRequest {
  videoR2Key: string;
}

export interface CompleteUploadResponse {
  videoR2Key: string;
  sizeBytes: number;
  contentType?: string;
  publicUrl?: string;
}

export async function presignUpload(
  request: PresignUploadRequest,
): Promise<PresignUploadResponse> {
  const response = await httpClient.post<PresignUploadResponse>(
    "/uploads/presign",
    request,
  );

  return response.data;
}

export async function uploadFileToPresignedUrl(
  uploadUrl: string,
  file: File,
  headers: PresignUploadResponse["headers"],
  onUploadProgress: (event: AxiosProgressEvent) => void,
): Promise<void> {
  await axios.put(uploadUrl, file, {
    headers,
    onUploadProgress,
  });
}

export async function completeUpload(
  request: CompleteUploadRequest,
): Promise<CompleteUploadResponse> {
  const response = await httpClient.post<CompleteUploadResponse>(
    "/uploads/complete",
    request,
  );

  return response.data;
}
