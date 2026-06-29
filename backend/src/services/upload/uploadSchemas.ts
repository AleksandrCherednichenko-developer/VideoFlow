import { z } from "zod";

export const MAX_UPLOAD_SIZE_BYTES = 512 * 1024 * 1024;
export const PRESIGN_URL_EXPIRES_SECONDS = 3600;

export const ALLOWED_VIDEO_CONTENT_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

const filenameSchema = z
  .string()
  .min(1)
  .max(255)
  .refine(
    (value) =>
      !value.includes("/") &&
      !value.includes("\\") &&
      !value.includes(".."),
    { message: "Filename must not contain path separators" },
  );

export const presignUploadSchema = z.object({
  filename: filenameSchema,
  contentType: z.enum(ALLOWED_VIDEO_CONTENT_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_SIZE_BYTES),
});

export type PresignUploadInput = z.infer<typeof presignUploadSchema>;

export const completeUploadSchema = z.object({
  videoR2Key: z.string().min(1).max(512),
});

export type CompleteUploadInput = z.infer<typeof completeUploadSchema>;
