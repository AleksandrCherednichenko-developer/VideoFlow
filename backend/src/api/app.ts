import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "../config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { healthRouter } from "./routes/health.routes.js";

export function createApp(): express.Express {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);

  app.use(healthRouter);

  app.use(errorHandler);

  return app;
}
