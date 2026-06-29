import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "../../api/errors/AppError.js";
import {
  assertUserOwnsUploadKey,
  buildVideoR2Key,
  completeUpload,
  createPresignedUpload,
} from "./uploadService.js";

vi.mock("./r2Client.js", () => ({
  getR2Config: vi.fn(),
  createR2Client: vi.fn(() => ({})),
  createPresignedPutUrl: vi.fn(),
  getObjectMetadata: vi.fn(),
  buildPublicUrl: vi.fn(),
}));

import {
  buildPublicUrl,
  createPresignedPutUrl,
  getObjectMetadata,
  getR2Config,
} from "./r2Client.js";

const mockedGetR2Config = vi.mocked(getR2Config);
const mockedCreatePresignedPutUrl = vi.mocked(createPresignedPutUrl);
const mockedGetObjectMetadata = vi.mocked(getObjectMetadata);
const mockedBuildPublicUrl = vi.mocked(buildPublicUrl);

const userId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "22222222-2222-4222-8222-222222222222";

const baseR2Config = {
  accountId: "test-account-id",
  accessKeyId: "test-access-key",
  secretAccessKey: "test-secret-key",
  bucket: "videoflow-videos",
};

describe("uploadService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetR2Config.mockReturnValue(baseR2Config);
    mockedCreatePresignedPutUrl.mockResolvedValue("https://r2.example/upload");
    mockedGetObjectMetadata.mockResolvedValue({
      sizeBytes: 2048,
      contentType: "video/mp4",
    });
    mockedBuildPublicUrl.mockReturnValue(undefined);
  });

  it("generates user-scoped unique keys", () => {
    const firstKey = buildVideoR2Key(userId, "mp4");
    const secondKey = buildVideoR2Key(userId, "mp4");

    expect(firstKey).toMatch(
      /^users\/11111111-1111-4111-8111-111111111111\/uploads\/[0-9a-f-]+\.mp4$/,
    );
    expect(secondKey).not.toBe(firstKey);
  });

  it("creates a presigned upload response", async () => {
    const result = await createPresignedUpload(
      {
        filename: "clip.mp4",
        contentType: "video/mp4",
        sizeBytes: 1024,
      },
      userId,
    );

    expect(result.uploadUrl).toBe("https://r2.example/upload");
    expect(result.videoR2Key.startsWith(`users/${userId}/uploads/`)).toBe(true);
    expect(result.headers["Content-Type"]).toBe("video/mp4");
    expect(result.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(mockedCreatePresignedPutUrl).toHaveBeenCalledOnce();
  });

  it("refuses complete for another user's key", async () => {
    const foreignKey = buildVideoR2Key(otherUserId, "mp4");

    await expect(
      completeUpload({ videoR2Key: foreignKey }, userId),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "InvalidUploadKey",
    });
  });

  it("builds publicUrl only when R2_PUBLIC_URL is configured", async () => {
    const videoR2Key = buildVideoR2Key(userId, "mp4");
    mockedBuildPublicUrl.mockReturnValue(
      "https://cdn.example.com/users/file.mp4",
    );

    const result = await completeUpload({ videoR2Key }, userId);

    expect(result.publicUrl).toBe("https://cdn.example.com/users/file.mp4");
    expect(mockedBuildPublicUrl).toHaveBeenCalledWith(
      baseR2Config,
      videoR2Key,
    );
  });

  it("returns upload metadata without publicUrl when it is not configured", async () => {
    const videoR2Key = buildVideoR2Key(userId, "mp4");
    mockedBuildPublicUrl.mockReturnValue(undefined);

    const result = await completeUpload({ videoR2Key }, userId);

    expect(result.publicUrl).toBeUndefined();
    expect(result.sizeBytes).toBe(2048);
    expect(result.contentType).toBe("video/mp4");
  });

  it("throws UploadNotFound when object is missing in storage", async () => {
    const videoR2Key = buildVideoR2Key(userId, "mp4");
    mockedGetObjectMetadata.mockResolvedValue(null);

    await expect(
      completeUpload({ videoR2Key }, userId),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "UploadNotFound",
    });
  });

  it("throws StorageUnavailable when R2 is not configured", async () => {
    mockedGetR2Config.mockImplementation(() => {
      throw new AppError(
        503,
        "StorageUnavailable",
        "Cloudflare R2 storage is not configured",
      );
    });

    await expect(
      createPresignedUpload(
        {
          filename: "clip.mp4",
          contentType: "video/mp4",
          sizeBytes: 1024,
        },
        userId,
      ),
    ).rejects.toMatchObject({
      statusCode: 503,
      code: "StorageUnavailable",
    });
  });

  it("rejects invalid upload key prefixes", () => {
    expect(() =>
      assertUserOwnsUploadKey(userId, "public/shared/video.mp4"),
    ).toThrow(AppError);
  });
});
