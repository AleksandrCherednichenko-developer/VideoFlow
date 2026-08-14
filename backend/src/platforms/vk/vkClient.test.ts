import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildVkVideoAttachment,
  buildVkVideoUrl,
  buildVkWallPostUrl,
  createWallPost,
  getGroupById,
  saveVideo,
  uploadVideo,
} from "./vkClient.js";

describe("vkClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds stable VK video identifiers and URLs", () => {
    expect(buildVkVideoAttachment(123, 456)).toBe("video123_456");
    expect(buildVkVideoUrl(123, 456)).toBe("https://vk.com/video123_456");
    expect(buildVkWallPostUrl(12345, 789)).toBe("https://vk.com/wall-12345_789");
  });

  it("looks up VK communities by group ID", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          response: [
            {
              id: 12345,
              name: "Test Community",
              screen_name: "testcommunity",
            },
          ],
        }),
      ),
    );

    const result = await getGroupById("vk-token", "12345");
    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    const body = init?.body as URLSearchParams;

    expect(result).toMatchObject({
      id: 12345,
      name: "Test Community",
      screenName: "testcommunity",
    });
    expect(body.get("group_id")).toBe("12345");
    expect(body.get("access_token")).toBe("vk-token");
  });

  it("calls video.save and parses upload metadata", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          response: {
            upload_url: "https://upload.vk.example",
            owner_id: 123,
            video_id: 456,
          },
        }),
      ),
    );

    const result = await saveVideo({
      accessToken: "vk-token",
      name: "Video title",
      description: "Video description",
    });
    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    const body = init?.body as URLSearchParams;

    expect(result).toMatchObject({
      uploadUrl: "https://upload.vk.example",
      ownerId: 123,
      videoId: 456,
    });
    expect(body.get("access_token")).toBe("vk-token");
    expect(body.get("name")).toBe("Video title");
    expect(body.get("description")).toBe("Video description");
    expect(body.get("wallpost")).toBe("0");
  });

  it("uploads video as multipart form data", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          response: 1,
        }),
      ),
    );

    await uploadVideo({
      uploadUrl: "https://upload.vk.example",
      video: Buffer.from("video"),
      filename: "clip.mp4",
      contentType: "video/mp4",
    });

    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];

    expect(url).toBe("https://upload.vk.example");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
  });

  it("creates wall posts with video attachments", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          response: {
            post_id: 789,
          },
        }),
      ),
    );

    const result = await createWallPost({
      accessToken: "vk-token",
      ownerId: 123,
      videoId: 456,
      message: "Post message",
    });
    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    const body = init?.body as URLSearchParams;

    expect(result.postId).toBe(789);
    expect(body.get("attachments")).toBe("video123_456");
    expect(body.get("message")).toBe("Post message");
    expect(body.get("owner_id")).toBe("123");
  });

  it("creates link-only wall posts without attachments", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          response: {
            post_id: 321,
          },
        }),
      ),
    );

    await createWallPost({
      accessToken: "vk-token",
      ownerId: -12345,
      message: "Post message\n\nhttps://video.example.com/clip.mp4",
    });
    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    const body = init?.body as URLSearchParams;

    expect(body.get("attachments")).toBeNull();
    expect(body.get("owner_id")).toBe("-12345");
  });

  it("maps VK JSON errors into typed failures", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            error_code: 5,
            error_msg: "User authorization failed",
          },
        }),
      ),
    );

    await expect(
      saveVideo({
        accessToken: "bad-token",
        name: "Video title",
        description: "Video description",
      }),
    ).rejects.toMatchObject({
      code: "VkVideoSaveFailed",
      message: "User authorization failed",
    });
  });
});
