import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";

import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { createApp } from "./api/app.js";

const app = createApp();

interface ListeningServer {
  protocol: "http" | "https";
  server: http.Server | https.Server;
  host: string;
  port: number;
}

function readTlsFile(filePath: string | undefined, label: string): Buffer {
  if (filePath === undefined || filePath.trim().length === 0) {
    throw new Error(`${label} path is required when HTTPS is enabled`);
  }

  return fs.readFileSync(path.resolve(process.cwd(), filePath));
}

function createPrimaryServer(): ListeningServer {
  if (!env.API_HTTPS_ENABLED) {
    return {
      protocol: "http",
      server: http.createServer(app),
      host: env.API_HOST,
      port: env.API_PORT,
    };
  }

  return {
    protocol: "https",
    server: https.createServer(
      {
        key: readTlsFile(env.API_TLS_KEY_PATH, "TLS key"),
        cert: readTlsFile(env.API_TLS_CERT_PATH, "TLS certificate"),
      },
      app,
    ),
    host: env.API_HOST,
    port: env.API_PORT,
  };
}

const servers: ListeningServer[] = [createPrimaryServer()];

if (env.API_HTTPS_ENABLED && env.API_HTTP_PORT !== undefined) {
  servers.push({
    protocol: "http",
    server: http.createServer(app),
    host: env.API_HOST,
    port: env.API_HTTP_PORT,
  });
}

for (const { protocol, server, host, port } of servers) {
  server.listen(port, host, () => {
    console.info(`VideoFlow API listening at ${protocol}://${host}:${port}`);
  });
}

function shutdown(signal: NodeJS.Signals): void {
  console.info(`Received ${signal}. Closing API server.`);

  let remainingServers = servers.length;

  for (const { server } of servers) {
    server.close(() => {
      remainingServers -= 1;

      if (remainingServers > 0) {
        return;
      }

      void prisma.$disconnect().finally(() => {
        process.exit(0);
      });
    });
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
