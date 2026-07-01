import { describe, expect, it } from "vitest";

import {
  PLATFORM,
  PLATFORM_RESULT_STATUS,
  PUBLICATION_STATUS,
  type PublicationResponse,
} from "../api/publicationApi";
import {
  buildPlatformStatusRows,
  buildStatusCounters,
  filterPublications,
  getNextScheduledPublication,
  isPublicationRetryable,
  PLATFORM_FILTER,
  PUBLICATION_STATUS_FILTER,
} from "./publicationViewModel";

function buildPublication(
  overrides: Partial<PublicationResponse>,
): PublicationResponse {
  return {
    id: "publication-id",
    userId: "user-id",
    videoR2Key: "users/user-id/uploads/video.mp4",
    defaultText: "Default text",
    scheduledAt: "2026-07-01T10:00:00.000Z",
    status: PUBLICATION_STATUS.SCHEDULED,
    platforms: [
      {
        platform: PLATFORM.VK,
        enabled: true,
        text: null,
      },
    ],
    metadata: null,
    results: [],
    createdAt: "2026-06-30T10:00:00.000Z",
    updatedAt: "2026-06-30T10:00:00.000Z",
    ...overrides,
  };
}

describe("publicationViewModel", () => {
  it("filters publications by status and platform", () => {
    const publications = [
      buildPublication({
        id: "scheduled-vk",
        status: PUBLICATION_STATUS.SCHEDULED,
      }),
      buildPublication({
        id: "failed-youtube",
        status: PUBLICATION_STATUS.FAILED,
        platforms: [
          {
            platform: PLATFORM.YOUTUBE,
            enabled: true,
            title: "Video",
            text: null,
          },
        ],
      }),
    ];

    expect(
      filterPublications(
        publications,
        PUBLICATION_STATUS_FILTER.FAILED,
        PLATFORM_FILTER.YOUTUBE,
      ).map((publication) => publication.id),
    ).toEqual(["failed-youtube"]);
  });

  it("selects the next future scheduled publication", () => {
    const publications = [
      buildPublication({
        id: "later",
        scheduledAt: "2026-07-01T12:00:00.000Z",
      }),
      buildPublication({
        id: "past",
        scheduledAt: "2026-06-29T12:00:00.000Z",
      }),
      buildPublication({
        id: "next",
        scheduledAt: "2026-07-01T11:00:00.000Z",
      }),
    ];

    expect(
      getNextScheduledPublication(
        publications,
        new Date("2026-06-30T00:00:00.000Z"),
      )?.id,
    ).toBe("next");
  });

  it("counts dashboard statuses", () => {
    const counters = buildStatusCounters([
      buildPublication({ status: PUBLICATION_STATUS.SCHEDULED }),
      buildPublication({ status: PUBLICATION_STATUS.PUBLISHING }),
      buildPublication({ status: PUBLICATION_STATUS.FAILED }),
      buildPublication({ status: PUBLICATION_STATUS.PARTIAL }),
    ]);

    expect(counters).toEqual([
      { label: "Scheduled", value: "1" },
      { label: "Publishing", value: "1" },
      { label: "Published", value: "0" },
      { label: "Failed", value: "1" },
    ]);
  });

  it("allows retry only for failed and partial publications", () => {
    expect(
      isPublicationRetryable(
        buildPublication({ status: PUBLICATION_STATUS.FAILED }),
      ),
    ).toBe(true);
    expect(
      isPublicationRetryable(
        buildPublication({ status: PUBLICATION_STATUS.PARTIAL }),
      ),
    ).toBe(true);
    expect(
      isPublicationRetryable(
        buildPublication({ status: PUBLICATION_STATUS.SCHEDULED }),
      ),
    ).toBe(false);
  });

  it("builds platform status rows from enabled platforms and results", () => {
    const rows = buildPlatformStatusRows(
      buildPublication({
        platforms: [
          {
            platform: PLATFORM.VK,
            enabled: true,
            text: null,
          },
          {
            platform: PLATFORM.YOUTUBE,
            enabled: true,
            title: "Title",
            text: null,
          },
        ],
        results: [
          {
            id: "result-id",
            platform: PLATFORM.VK,
            status: PLATFORM_RESULT_STATUS.PUBLISHED,
            externalId: "vk-id",
            resultUrl: "https://vk.example/video",
            errorCode: null,
            errorMessage: null,
            rawResponse: null,
            createdAt: "2026-06-30T10:00:00.000Z",
            updatedAt: "2026-06-30T10:00:00.000Z",
          },
        ],
      }),
    );

    expect(rows).toEqual([
      {
        platform: PLATFORM.VK,
        label: "VK",
        status: PLATFORM_RESULT_STATUS.PUBLISHED,
        resultUrl: "https://vk.example/video",
        errorMessage: null,
      },
      {
        platform: PLATFORM.YOUTUBE,
        label: "YouTube",
        status: PLATFORM_RESULT_STATUS.PENDING,
        resultUrl: null,
        errorMessage: null,
      },
    ]);
  });
});
