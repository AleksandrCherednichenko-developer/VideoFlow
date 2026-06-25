import { Router } from "express";

import { checkDatabaseConnection } from "../../db/checkDatabaseConnection.js";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res, next) => {
  try {
    await checkDatabaseConnection();

    res.json({
      status: "ok",
      service: "videoflow-api",
      database: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});
