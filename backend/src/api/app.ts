import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";

import { env } from "../config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { authRouter } from "./routes/auth.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { oauthRouter } from "./routes/oauth.routes.js";
import { publicationRouter } from "./routes/publication.routes.js";
import { uploadRouter } from "./routes/upload.routes.js";

function getAllowedCorsOrigins(): Set<string> {
  return new Set([
    env.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://videoflow-app.tk:5173",
  ]);
}

export function createApp(): express.Express {
  const app = express();
  const allowedCorsOrigins = getAllowedCorsOrigins();

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (origin === undefined || allowedCorsOrigins.has(origin)) {
          callback(null, true);
          return;
        }

        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(requestLogger);

  app.use(healthRouter);
  app.use(authRouter);
  app.use(oauthRouter);
  app.use(uploadRouter);
  app.use(publicationRouter);

  app.use(errorHandler);

  return app;
}
