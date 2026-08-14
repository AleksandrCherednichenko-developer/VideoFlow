import { describe, expect, it } from "vitest";

import { PLATFORM } from "../../config/constants.js";

import { publishPlatform } from "./platformPublisher.js";

describe("platformPublisher", () => {
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

});
