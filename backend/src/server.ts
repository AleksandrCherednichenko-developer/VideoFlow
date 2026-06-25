import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { createApp } from "./api/app.js";

const app = createApp();

const server = app.listen(env.API_PORT, env.API_HOST, () => {
  console.info(`VideoFlow API listening on ${env.API_HOST}:${env.API_PORT}`);
});

function shutdown(signal: NodeJS.Signals): void {
  console.info(`Received ${signal}. Closing API server.`);

  server.close(() => {
    void prisma.$disconnect().finally(() => {
      process.exit(0);
    });
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
