import { describe, expect, it } from "vitest";

import { createPublicationSchema } from "./publicationSchemas.js";

const baseInput = {
  videoR2Key: "users/user-id/uploads/video.mp4",
  defaultText: "Launch text",
  scheduledAt: "2026-06-28T10:00:00.000Z",
};

describe("publicationSchemas", () => {
  it("accepts a valid publication payload", () => {
    const input = createPublicationSchema.parse({
      ...baseInput,
      platforms: [
        {
          platform: "youtube",
          enabled: true,
          title: "Video title",
          text: null,
        },
        {
          platform: "vk",
          enabled: false,
        },
      ],
    });

    expect(input.platforms[0]).toMatchObject({
      platform: "youtube",
      enabled: true,
      title: "Video title",
    });
  });

  it("requires at least one enabled platform", () => {
    expect(() =>
      createPublicationSchema.parse({
        ...baseInput,
        platforms: [
          {
            platform: "vk",
            enabled: false,
          },
        ],
      }),
    ).toThrow();
  });

  it("requires YouTube title when YouTube is enabled", () => {
    expect(() =>
      createPublicationSchema.parse({
        ...baseInput,
        platforms: [
          {
            platform: "youtube",
            enabled: true,
          },
        ],
      }),
    ).toThrow();
  });

  it("requires Pinterest title and board_id when Pinterest is enabled", () => {
    expect(() =>
      createPublicationSchema.parse({
        ...baseInput,
        platforms: [
          {
            platform: "pinterest",
            enabled: true,
            title: "Pin title",
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects duplicate platform entries", () => {
    expect(() =>
      createPublicationSchema.parse({
        ...baseInput,
        platforms: [
          {
            platform: "vk",
            enabled: true,
          },
          {
            platform: "vk",
            enabled: false,
          },
        ],
      }),
    ).toThrow();
  });
});
