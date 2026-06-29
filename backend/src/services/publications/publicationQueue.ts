import { Queue, type JobsOptions } from "bullmq";

import { env } from "../../config/env.js";

export const PUBLICATION_QUEUE_NAME = "publication";

export const PUBLICATION_RETRY_DELAYS_MS = [
  0,
  5 * 60 * 1000,
  30 * 60 * 1000,
  2 * 60 * 60 * 1000,
] as const;

export interface PublicationJobData {
  publicationId: string;
  userId: string;
}

export interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
  maxRetriesPerRequest: null;
}

let publicationQueue: Queue<PublicationJobData> | undefined;

interface PublicationJobLike {
  remove(): Promise<void>;
}

export interface PublicationQueueLike {
  add(
    name: string,
    data: PublicationJobData,
    options: JobsOptions,
  ): Promise<unknown>;
}

export interface PublicationQueueLookupLike {
  getJob(jobId: string): Promise<PublicationJobLike | undefined | null>;
}

export function createRedisConnectionOptions(
  redisUrl: string,
): RedisConnectionOptions {
  const url = new URL(redisUrl);
  const options: RedisConnectionOptions = {
    host: url.hostname,
    port: Number(url.port || 6379),
    maxRetriesPerRequest: null,
  };

  if (url.password.length > 0) {
    options.password = decodeURIComponent(url.password);
  }

  return options;
}

export function getPublicationQueue(): Queue<PublicationJobData> {
  if (publicationQueue === undefined) {
    publicationQueue = new Queue<PublicationJobData>(PUBLICATION_QUEUE_NAME, {
      connection: createRedisConnectionOptions(env.REDIS_URL),
    });
  }

  return publicationQueue;
}

export function calculateScheduleDelayMs(
  scheduledAt: Date,
  now = new Date(),
): number {
  return Math.max(scheduledAt.getTime() - now.getTime(), 0);
}

export function calculateRetryDelayMs(retryCount: number): number | null {
  return PUBLICATION_RETRY_DELAYS_MS[retryCount] ?? null;
}

export async function schedulePublicationJob(
  data: PublicationJobData,
  scheduledAt: Date,
  queue: PublicationQueueLike = getPublicationQueue(),
): Promise<void> {
  await queue.add("publish", data, {
    jobId: `publication-${data.publicationId}`,
    delay: calculateScheduleDelayMs(scheduledAt),
    attempts: 1,
    removeOnComplete: 100,
    removeOnFail: false,
  });
}

export async function schedulePublicationRetryJob(
  data: PublicationJobData,
  retryCount: number,
  queue: PublicationQueueLike = getPublicationQueue(),
): Promise<void> {
  const delay = calculateRetryDelayMs(retryCount);

  if (delay === null) {
    throw new Error("Retry policy exhausted");
  }

  await queue.add("publish", data, {
    jobId: `publication-${data.publicationId}-retry-${retryCount + 1}`,
    delay,
    attempts: 1,
    removeOnComplete: 100,
    removeOnFail: false,
  });
}

export async function cancelPublicationJobs(
  publicationId: string,
  queue: PublicationQueueLookupLike = getPublicationQueue(),
): Promise<void> {
  const jobIds = [
    `publication-${publicationId}`,
    ...PUBLICATION_RETRY_DELAYS_MS.map(
      (_delay, index) => `publication-${publicationId}-retry-${index + 1}`,
    ),
  ];

  for (const jobId of jobIds) {
    const job = await queue.getJob(jobId);
    await job?.remove();
  }
}
