import { describe, expect, it } from "vitest";

import {
  buildCreatePublicationRequest,
  buildPublicationPlatforms,
  formatFileSize,
  hasCreatePublicationValidationErrors,
  localDateTimeToUtcIso,
  validateCreatePublicationForm,
  validateSelectedVideoFile,
} from "./createPublicationForm";

describe("createPublicationForm", () => {
  it("formats video sizes for display", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1024 * 1024)).toBe("1.00 MB");
    expect(formatFileSize(12 * 1024 * 1024)).toBe("12.0 MB");
  });

  it("converts local date and time to a UTC ISO string", () => {
    expect(localDateTimeToUtcIso("2026-06-29", "10:30")).toMatch(
      /^\d{4}-\d{2}-\d{2}T/,
    );
    expect(localDateTimeToUtcIso("", "10:30")).toBeNull();
  });

  it("builds YouTube and VK payload with overrides", () => {
    expect(
      buildPublicationPlatforms(
        {
          youtube: true,
          vk: true,
        },
        "  Launch title ",
        {
          youtubeText: " YouTube copy ",
          vkText: "",
        },
      ),
    ).toEqual([
      {
        platform: "youtube",
        enabled: true,
        title: "Launch title",
        text: "YouTube copy",
      },
      {
        platform: "vk",
        enabled: true,
        text: null,
      },
    ]);
  });

  it("builds create publication payload", () => {
    const request = buildCreatePublicationRequest({
      videoR2Key: "users/user-id/uploads/video.mp4",
      defaultText: " Default copy ",
      date: "2026-06-29",
      time: "10:30",
      platforms: {
        youtube: false,
        vk: true,
      },
      youtubeTitle: "",
      overrides: {
        youtubeText: "",
        vkText: "VK copy",
      },
    });

    expect(request).toMatchObject({
      videoR2Key: "users/user-id/uploads/video.mp4",
      defaultText: "Default copy",
      platforms: [
        {
          platform: "youtube",
          enabled: false,
          text: null,
        },
        {
          platform: "vk",
          enabled: true,
          text: "VK copy",
        },
      ],
    });
    expect(request?.scheduledAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("validates selected video files", () => {
    expect(validateSelectedVideoFile(null)).toBe("Choose a video file.");
    expect(
      validateSelectedVideoFile({
        name: "clip.gif",
        size: 1024,
        type: "image/gif",
      }),
    ).toBe("Use an MP4, MOV, or WebM video.");
    expect(
      validateSelectedVideoFile({
        name: "clip.mp4",
        size: 1024,
        type: "video/mp4",
      }),
    ).toBeNull();
  });

  it("returns validation errors for incomplete form state", () => {
    const errors = validateCreatePublicationForm({
      selectedFile: null,
      defaultText: " ",
      date: "",
      time: "10:30",
      platforms: {
        youtube: true,
        vk: false,
      },
      youtubeTitle: "",
      overrides: {
        youtubeText: "",
        vkText: "",
      },
    });

    expect(errors).toMatchObject({
      selectedFile: "Choose a video file.",
      defaultText: "Add a publication text.",
      scheduledAt: "Choose a valid publication date and time.",
      youtubeTitle: "Add a YouTube title.",
    });
    expect(hasCreatePublicationValidationErrors(errors)).toBe(true);
  });

  it("accepts valid MVP form state", () => {
    const errors = validateCreatePublicationForm({
      selectedFile: {
        name: "clip.webm",
        size: 1024,
        type: "video/webm",
      },
      defaultText: "Launch copy",
      date: "2026-06-29",
      time: "10:30",
      platforms: {
        youtube: false,
        vk: true,
      },
      youtubeTitle: "",
      overrides: {
        youtubeText: "",
        vkText: "",
      },
    });

    expect(errors).toEqual({});
    expect(hasCreatePublicationValidationErrors(errors)).toBe(false);
  });
});
