import { describe, expect, it } from "vitest";

import {
  MAX_UPLOAD_SIZE_BYTES,
  completeUploadSchema,
  presignUploadSchema,
} from "./uploadSchemas.js";

describe("uploadSchemas", () => {
  it("accepts valid video metadata", () => {
    const input = presignUploadSchema.parse({
      filename: "my-video.mp4",
      contentType: "video/mp4",
      sizeBytes: 1024,
    });

    expect(input).toEqual({
      filename: "my-video.mp4",
      contentType: "video/mp4",
      sizeBytes: 1024,
    });
  });

  it("rejects unsupported MIME type", () => {
    expect(() =>
      presignUploadSchema.parse({
        filename: "video.avi",
        contentType: "video/x-msvideo",
        sizeBytes: 1024,
      }),
    ).toThrow();
  });

  it("rejects zero or negative sizeBytes", () => {
    expect(() =>
      presignUploadSchema.parse({
        filename: "video.mp4",
        contentType: "video/mp4",
        sizeBytes: 0,
      }),
    ).toThrow();

    expect(() =>
      presignUploadSchema.parse({
        filename: "video.mp4",
        contentType: "video/mp4",
        sizeBytes: -1,
      }),
    ).toThrow();
  });

  it("rejects files larger than the configured max size", () => {
    expect(() =>
      presignUploadSchema.parse({
        filename: "video.mp4",
        contentType: "video/mp4",
        sizeBytes: MAX_UPLOAD_SIZE_BYTES + 1,
      }),
    ).toThrow();
  });

  it("rejects path-like filenames", () => {
    expect(() =>
      presignUploadSchema.parse({
        filename: "../video.mp4",
        contentType: "video/mp4",
        sizeBytes: 1024,
      }),
    ).toThrow();
  });

  it("accepts complete upload payload with videoR2Key", () => {
    const input = completeUploadSchema.parse({
      videoR2Key: "users/user-id/uploads/file.mp4",
    });

    expect(input.videoR2Key).toBe("users/user-id/uploads/file.mp4");
  });
});
