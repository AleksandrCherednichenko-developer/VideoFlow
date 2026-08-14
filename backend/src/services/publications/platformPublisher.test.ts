import { beforeEach, describe, expect, it, vi } from "vitest";

import { PLATFORM } from "../../config/constants.js";

const accountMocks = vi.hoisted(() => ({
  getActivePlatformAccountSecret: vi.fn(),
}));

const r2Mocks = vi.hoisted(() => ({
  getR2Config: vi.fn(),
  buildPublicUrl: vi.fn(),
  createR2Client: vi.fn(),
  createPresignedGetUrl: vi.fn(),
}));

const vkMocks = vi.hoisted(() => ({
  createWallPost: vi.fn(),
}));

vi.mock("../oauth/accountService.js", () => accountMocks);
vi.mock("../upload/r2Client.js", () => ({
  ...r2Mocks,
  PRESIGNED_GET_URL_MAX_EXPIRES_SECONDS: 604800,
}));
vi.mock("../../platforms/vk/vkClient.js", async () => {
  const actual = await vi.importActual<typeof import("../../platforms/vk/vkClient.js")>(
    "../../platforms/vk/vkClient.js",
  );

  return {
    ...actual,
    createWallPost: vkMocks.createWallPost,
  };
});

import { publishPlatform, publishVk } from "./platformPublisher.js";

describe("platformPublisher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accountMocks.getActivePlatformAccountSecret.mockResolvedValue({
      accessToken: "vk-community-token",
      externalAccountId: "12345",
      metadata: null,
      expiresAt: null,
    });
    r2Mocks.getR2Config.mockReturnValue({
      accountId: "account",
      accessKeyId: "key",
      secretAccessKey: "secret",
      bucket: "videoflow",
      publicUrl: "https://cdn.example.com/videoflow",
    });
    r2Mocks.buildPublicUrl.mockReturnValue(
      "https://cdn.example.com/videoflow/users/user-id/uploads/video.mp4",
    );
    vkMocks.createWallPost.mockResolvedValue({
      postId: 789,
      rawResponse: { response: { post_id: 789 } },
    });
  });

  it("skips platforms without an implemented worker", async () => {
    const result = await publishPlatform({
      publicationId: "22222222-2222-4222-8222-222222222222",
      userId: "11111111-1111-4111-8111-111111111111",
      videoR2Key: "users/user-id/uploads/video.mp4",
      defaultText: "Default text",
      platforms: [
        {
          platform: PLATFORM.YOUTUBE,
          enabled: true,
        },
      ],
      platform: PLATFORM.YOUTUBE,
    });

    expect(result).toEqual({
      outcome: "skipped",
      externalId: null,
      resultUrl: null,
      rawResponse: {
        platform: PLATFORM.YOUTUBE,
      },
      errorCode: "PlatformWorkerNotImplemented",
      errorMessage: "Platform worker is not implemented yet",
    });
  });

  it("publishes VK posts as wall links without native video upload", async () => {
    const result = await publishVk({
      publicationId: "22222222-2222-4222-8222-222222222222",
      userId: "11111111-1111-4111-8111-111111111111",
      videoR2Key: "users/user-id/uploads/video.mp4",
      defaultText: "Default text",
      platforms: [
        {
          platform: PLATFORM.VK,
          enabled: true,
        },
      ],
      platform: PLATFORM.VK,
    });

    expect(r2Mocks.buildPublicUrl).toHaveBeenCalled();
    expect(r2Mocks.createPresignedGetUrl).not.toHaveBeenCalled();
    expect(vkMocks.createWallPost).toHaveBeenCalledWith({
      accessToken: "vk-community-token",
      ownerId: -12345,
      message:
        "Default text\n\nhttps://cdn.example.com/videoflow/users/user-id/uploads/video.mp4",
    });
    expect(result).toMatchObject({
      outcome: "published",
      externalId: "-12345_789",
      resultUrl: "https://vk.com/wall-12345_789",
      errorCode: null,
      errorMessage: null,
    });
  });

  it("falls back to a presigned video link when R2 public URL is unavailable", async () => {
    r2Mocks.buildPublicUrl.mockReturnValue(undefined);
    r2Mocks.createPresignedGetUrl.mockResolvedValue(
      "https://signed.example.com/video.mp4",
    );

    await publishVk({
      publicationId: "22222222-2222-4222-8222-222222222222",
      userId: "11111111-1111-4111-8111-111111111111",
      videoR2Key: "users/user-id/uploads/video.mp4",
      defaultText: "Default text",
      platforms: [
        {
          platform: PLATFORM.VK,
          enabled: true,
        },
      ],
      platform: PLATFORM.VK,
    });

    expect(r2Mocks.createPresignedGetUrl).toHaveBeenCalled();
    expect(vkMocks.createWallPost).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Default text\n\nhttps://signed.example.com/video.mp4",
      }),
    );
  });
});
