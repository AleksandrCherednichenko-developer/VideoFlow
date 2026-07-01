import {
  Platform as PrismaPlatform,
  PlatformResultStatus as PrismaPlatformResultStatus,
  PublicationStatus as PrismaPublicationStatus,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  publication: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  publicationResult: {
    upsert: vi.fn(),
    update: vi.fn(),
  },
}));

const queueMocks = vi.hoisted(() => ({
  schedulePublicationJob: vi.fn(),
  schedulePublicationRetryJob: vi.fn(),
  cancelPublicationJobs: vi.fn(),
}));

const publisherMocks = vi.hoisted(() => ({
  publishPlatform: vi.fn(),
}));

vi.mock("../../db/prisma.js", () => ({
  prisma: prismaMocks,
}));

vi.mock("./publicationQueue.js", () => {
  const retryDelays = [
    0,
    5 * 60 * 1000,
    30 * 60 * 1000,
    2 * 60 * 60 * 1000,
  ] as const;

  return {
    calculateRetryDelayMs: (retryCount: number) => retryDelays[retryCount] ?? null,
    schedulePublicationJob: queueMocks.schedulePublicationJob,
    schedulePublicationRetryJob: queueMocks.schedulePublicationRetryJob,
    cancelPublicationJobs: queueMocks.cancelPublicationJobs,
  };
});

vi.mock("./platformPublisher.js", () => ({
  PlatformPublishError: class PlatformPublishError extends Error {
    public readonly code: string;
    public readonly rawResponse: unknown;

    public constructor(code: string, message: string, rawResponse?: unknown) {
      super(message);
      this.code = code;
      this.rawResponse = rawResponse;
    }
  },
  publishPlatform: publisherMocks.publishPlatform,
}));

import {
  aggregatePublicationStatus,
  createPublication,
  deletePublication,
  processPublicationJob,
  resolvePlatformText,
  retryPublication,
} from "./publicationService.js";

const userId = "11111111-1111-4111-8111-111111111111";
const publicationId = "22222222-2222-4222-8222-222222222222";
const now = new Date("2026-06-28T10:00:00.000Z");

function buildPublication(overrides: Record<string, unknown> = {}) {
  return {
    id: publicationId,
    userId,
    videoR2Key: "users/user-id/uploads/video.mp4",
    defaultText: "Default text",
    scheduledAt: now,
    status: PrismaPublicationStatus.SCHEDULED,
    platforms: [
      {
        platform: "vk",
        enabled: true,
      },
    ],
    metadata: {
      retryCount: 0,
    },
    createdAt: now,
    updatedAt: now,
    results: [],
    ...overrides,
  };
}

describe("publicationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queueMocks.schedulePublicationJob.mockResolvedValue(undefined);
    queueMocks.schedulePublicationRetryJob.mockResolvedValue(undefined);
    queueMocks.cancelPublicationJobs.mockResolvedValue(undefined);
    prismaMocks.publication.update.mockResolvedValue(buildPublication());
    prismaMocks.publication.delete.mockResolvedValue(buildPublication());
    prismaMocks.publicationResult.upsert.mockResolvedValue(undefined);
    prismaMocks.publicationResult.update.mockResolvedValue(undefined);
    publisherMocks.publishPlatform.mockResolvedValue({
      outcome: "published",
      externalId: "vk-video-id",
      resultUrl: "https://vk.com/video1_2",
      rawResponse: {
        ok: true,
      },
      errorCode: null,
      errorMessage: null,
    });
  });

  it("creates scheduled publications and adds delayed jobs", async () => {
    const publication = buildPublication();
    prismaMocks.publication.create.mockResolvedValue(publication);

    const result = await createPublication(
      {
        videoR2Key: "users/user-id/uploads/video.mp4",
        defaultText: "Default text",
        scheduledAt: now.toISOString(),
        platforms: [
          {
            platform: "vk",
            enabled: true,
          },
        ],
      },
      userId,
    );

    expect(prismaMocks.publication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId,
          status: PrismaPublicationStatus.SCHEDULED,
        }),
      }),
    );
    expect(queueMocks.schedulePublicationJob).toHaveBeenCalledWith(
      {
        publicationId,
        userId,
      },
      now,
    );
    expect(result.status).toBe("scheduled");
  });

  it("resolves Threads text from Instagram settings", () => {
    expect(
      resolvePlatformText(
        [
          {
            platform: "instagram",
            enabled: true,
            text: "Instagram override",
          },
          {
            platform: "threads",
            enabled: true,
          },
        ],
        "threads",
        "Default text",
      ),
    ).toBe("Instagram override");
  });

  it("schedules retry jobs for failed publications", async () => {
    prismaMocks.publication.findFirst.mockResolvedValue(
      buildPublication({
        status: PrismaPublicationStatus.FAILED,
        metadata: {
          retryCount: 1,
        },
      }),
    );
    prismaMocks.publication.update.mockResolvedValue(
      buildPublication({
        status: PrismaPublicationStatus.SCHEDULED,
        metadata: {
          retryCount: 2,
        },
      }),
    );

    const result = await retryPublication(userId, publicationId);

    expect(queueMocks.schedulePublicationRetryJob).toHaveBeenCalledWith(
      {
        publicationId,
        userId,
      },
      1,
    );
    expect(result.status).toBe("scheduled");
  });

  it("refuses retry for scheduled publications", async () => {
    prismaMocks.publication.findFirst.mockResolvedValue(buildPublication());

    await expect(retryPublication(userId, publicationId)).rejects.toMatchObject({
      statusCode: 409,
      code: "PublicationNotRetryable",
    });
  });

  it("deletes only draft or scheduled publications and cancels jobs", async () => {
    prismaMocks.publication.findFirst.mockResolvedValue(buildPublication());

    await deletePublication(userId, publicationId);

    expect(queueMocks.cancelPublicationJobs).toHaveBeenCalledWith(publicationId);
    expect(prismaMocks.publication.delete).toHaveBeenCalledWith({
      where: {
        id: publicationId,
      },
    });
  });

  it("moves scheduled jobs into publishing and creates pending result rows", async () => {
    prismaMocks.publication.findUnique.mockResolvedValue(
      buildPublication({
        platforms: [
          {
            platform: "youtube",
            enabled: true,
            title: "Video title",
          },
          {
            platform: "vk",
            enabled: true,
          },
        ],
      }),
    );

    await processPublicationJob(publicationId);

    expect(prismaMocks.publication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: PrismaPublicationStatus.PUBLISHING,
        },
      }),
    );
    expect(prismaMocks.publicationResult.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          platform: PrismaPlatform.YOUTUBE,
          status: PrismaPlatformResultStatus.PENDING,
        }),
      }),
    );
    expect(prismaMocks.publicationResult.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          platform: PrismaPlatform.VK,
          status: PrismaPlatformResultStatus.PENDING,
        }),
      }),
    );
    expect(publisherMocks.publishPlatform).toHaveBeenCalledTimes(2);
    expect(prismaMocks.publicationResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PrismaPlatformResultStatus.PUBLISHED,
          resultUrl: "https://vk.com/video1_2",
        }),
      }),
    );
  });

  it("records failed platform publish attempts without failing the job", async () => {
    prismaMocks.publication.findUnique.mockResolvedValue(
      buildPublication({
        platforms: [
          {
            platform: "vk",
            enabled: true,
          },
        ],
      }),
    );
    publisherMocks.publishPlatform.mockRejectedValueOnce(
      new Error("VK publish failed"),
    );

    await processPublicationJob(publicationId);

    expect(prismaMocks.publicationResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PrismaPlatformResultStatus.FAILED,
          errorCode: "PlatformPublishFailed",
          errorMessage: "VK publish failed",
        }),
      }),
    );
  });

  it("aggregates mixed platform results into partial status", async () => {
    prismaMocks.publication.findUnique.mockResolvedValue(
      buildPublication({
        platforms: [
          {
            platform: "youtube",
            enabled: true,
            title: "Video title",
          },
          {
            platform: "vk",
            enabled: true,
          },
        ],
        results: [
          {
            id: "result-1",
            publicationId,
            platform: PrismaPlatform.YOUTUBE,
            status: PrismaPlatformResultStatus.PUBLISHED,
            externalId: "youtube-id",
            resultUrl: "https://youtube.example/video",
            errorCode: null,
            errorMessage: null,
            rawResponse: null,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: "result-2",
            publicationId,
            platform: PrismaPlatform.VK,
            status: PrismaPlatformResultStatus.FAILED,
            externalId: null,
            resultUrl: null,
            errorCode: "VkError",
            errorMessage: "VK failed",
            rawResponse: null,
            createdAt: now,
            updatedAt: now,
          },
        ],
      }),
    );

    const status = await aggregatePublicationStatus(publicationId);

    expect(status).toBe("partial");
    expect(prismaMocks.publication.update).toHaveBeenCalledWith({
      where: {
        id: publicationId,
      },
      data: {
        status: PrismaPublicationStatus.PARTIAL,
      },
    });
  });

  it("aggregates published and skipped platform results into partial status", async () => {
    prismaMocks.publication.findUnique.mockResolvedValue(
      buildPublication({
        platforms: [
          {
            platform: "youtube",
            enabled: true,
            title: "Video title",
          },
          {
            platform: "vk",
            enabled: true,
          },
        ],
        results: [
          {
            id: "result-1",
            publicationId,
            platform: PrismaPlatform.YOUTUBE,
            status: PrismaPlatformResultStatus.SKIPPED,
            externalId: null,
            resultUrl: null,
            errorCode: "PlatformWorkerNotImplemented",
            errorMessage: "Platform worker is not implemented yet",
            rawResponse: null,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: "result-2",
            publicationId,
            platform: PrismaPlatform.VK,
            status: PrismaPlatformResultStatus.PUBLISHED,
            externalId: "vk-id",
            resultUrl: "https://vk.com/video1_2",
            errorCode: null,
            errorMessage: null,
            rawResponse: null,
            createdAt: now,
            updatedAt: now,
          },
        ],
      }),
    );

    const status = await aggregatePublicationStatus(publicationId);

    expect(status).toBe("partial");
    expect(prismaMocks.publication.update).toHaveBeenCalledWith({
      where: {
        id: publicationId,
      },
      data: {
        status: PrismaPublicationStatus.PARTIAL,
      },
    });
  });
});
