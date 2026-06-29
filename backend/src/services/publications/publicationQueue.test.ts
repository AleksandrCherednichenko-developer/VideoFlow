import { describe, expect, it, vi } from "vitest";

vi.mock("../../config/env.js", () => ({
  env: {
    REDIS_URL: "redis://localhost:6379",
  },
}));

import {
  calculateRetryDelayMs,
  calculateScheduleDelayMs,
  cancelPublicationJobs,
  createRedisConnectionOptions,
  schedulePublicationJob,
  schedulePublicationRetryJob,
} from "./publicationQueue.js";

describe("publicationQueue", () => {
  it("creates Redis connection options from URL", () => {
    expect(
      createRedisConnectionOptions("redis://:secret@localhost:6380"),
    ).toEqual({
      host: "localhost",
      port: 6380,
      password: "secret",
      maxRetriesPerRequest: null,
    });
  });

  it("calculates delayed schedule time without negative values", () => {
    const now = new Date("2026-06-28T10:00:00.000Z");

    expect(
      calculateScheduleDelayMs(
        new Date("2026-06-28T10:01:00.000Z"),
        now,
      ),
    ).toBe(60_000);
    expect(
      calculateScheduleDelayMs(
        new Date("2026-06-28T09:59:00.000Z"),
        now,
      ),
    ).toBe(0);
  });

  it("uses the configured publication retry policy", () => {
    expect(calculateRetryDelayMs(0)).toBe(0);
    expect(calculateRetryDelayMs(1)).toBe(5 * 60 * 1000);
    expect(calculateRetryDelayMs(2)).toBe(30 * 60 * 1000);
    expect(calculateRetryDelayMs(3)).toBe(2 * 60 * 60 * 1000);
    expect(calculateRetryDelayMs(4)).toBeNull();
  });

  it("adds delayed publication jobs with stable job ids", async () => {
    const queue = {
      add: vi.fn().mockResolvedValue(undefined),
    };

    await schedulePublicationJob(
      {
        publicationId: "publication-id",
        userId: "user-id",
      },
      new Date(Date.now() + 60_000),
      queue,
    );

    expect(queue.add).toHaveBeenCalledWith(
      "publish",
      {
        publicationId: "publication-id",
        userId: "user-id",
      },
      expect.objectContaining({
        jobId: "publication-publication-id",
        attempts: 1,
      }),
    );
  });

  it("adds retry jobs using retry-specific job ids", async () => {
    const queue = {
      add: vi.fn().mockResolvedValue(undefined),
    };

    await schedulePublicationRetryJob(
      {
        publicationId: "publication-id",
        userId: "user-id",
      },
      1,
      queue,
    );

    expect(queue.add).toHaveBeenCalledWith(
      "publish",
      {
        publicationId: "publication-id",
        userId: "user-id",
      },
      expect.objectContaining({
        jobId: "publication-publication-id-retry-2",
        delay: 5 * 60 * 1000,
      }),
    );
  });

  it("removes known scheduled and retry jobs", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const queue = {
      getJob: vi.fn().mockResolvedValue({
        remove,
      }),
    };

    await cancelPublicationJobs("publication-id", queue);

    expect(queue.getJob).toHaveBeenCalledWith("publication-publication-id");
    expect(queue.getJob).toHaveBeenCalledWith(
      "publication-publication-id-retry-4",
    );
    expect(remove).toHaveBeenCalledTimes(5);
  });
});
