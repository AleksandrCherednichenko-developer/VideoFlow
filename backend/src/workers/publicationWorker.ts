import { Worker } from "bullmq";

import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";

const QUEUE_NAME = "publication";

interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
  maxRetriesPerRequest: null;
}

function createRedisConnectionOptions(redisUrl: string): RedisConnectionOptions {
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

const connection = createRedisConnectionOptions(env.REDIS_URL);

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    console.info(`Received publication job ${job.id ?? "unknown"}`);
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
