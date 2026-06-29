import { Worker } from "bullmq";

import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import {
  createRedisConnectionOptions,
  PUBLICATION_QUEUE_NAME,
  type PublicationJobData,
} from "../services/publications/publicationQueue.js";
import { processPublicationJob } from "../services/publications/publicationService.js";

const connection = createRedisConnectionOptions(env.REDIS_URL);

const worker = new Worker<PublicationJobData>(
  PUBLICATION_QUEUE_NAME,
  async (job) => {
    console.info(`Received publication job ${job.id ?? "unknown"}`);
    await processPublicationJob(job.data.publicationId);
  },
  {
    connection,
    concurrency: env.WORKER_CONCURRENCY,
  },
);

worker.on("failed", (job, error) => {
  console.error(`Publication job ${job?.id ?? "unknown"} failed`, error);
});

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  console.info(`Received ${signal}. Closing publication worker.`);
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", (signal) => {
  void shutdown(signal);
});

process.on("SIGTERM", (signal) => {
  void shutdown(signal);
});
