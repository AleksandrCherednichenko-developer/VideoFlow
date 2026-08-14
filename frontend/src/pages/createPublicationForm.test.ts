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

  it("builds the three MVP platform payloads with overrides", () => {
    expect(
      buildPublicationPlatforms(
        {
          youtube: true,
          instagram: true,
          tiktok: true,
        },
        "  Launch title ",
        {
          youtubeText: " YouTube copy ",
          instagramText: " Instagram copy ",
          tiktokText: "",
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
        platform: "instagram",
        enabled: true,
        text: "Instagram copy",
      },
      {
        platform: "tiktok",
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
        instagram: true,
        tiktok: false,
      },
      youtubeTitle: "",
      overrides: {
        youtubeText: "",
        instagramText: "Instagram copy",
        tiktokText: "",
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
          platform: "instagram",
          enabled: true,
          text: "Instagram copy",
        },
        {
          platform: "tiktok",
          enabled: false,
          text: null,
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
        instagram: false,
        tiktok: false,
      },
      youtubeTitle: "",
      overrides: {
        youtubeText: "",
        instagramText: "",
        tiktokText: "",
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
        instagram: true,
        tiktok: false,
      },
      youtubeTitle: "",
      overrides: {
        youtubeText: "",
        instagramText: "",
        tiktokText: "",
      },
    });

    expect(errors).toEqual({});
    expect(hasCreatePublicationValidationErrors(errors)).toBe(false);
  });
});
