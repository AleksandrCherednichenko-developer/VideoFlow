import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { AppError } from "../errors/AppError.js";

const ERROR_NAME = {
  VALIDATION: "ValidationError",
  INTERNAL: "InternalServerError",
} as const;

interface ApiErrorBody {
  error: string;
  message: string;
  details?: unknown;
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    const body: ApiErrorBody = {
      error: ERROR_NAME.VALIDATION,
      message: "Request validation failed",
      details: error.flatten(),
    };

    res.status(400).json(body);
    return;
  }

  if (error instanceof AppError) {
    const body: ApiErrorBody = {
      error: error.code,
      message: error.message,
    };

    res.status(error.statusCode).json(body);
    return;
  }

  const body: ApiErrorBody = {
    error: ERROR_NAME.INTERNAL,
    message: "Unexpected server error",
  };

  if (process.env.NODE_ENV !== "production") {
    body.details = error instanceof Error ? error.message : error;
  }

  res.status(500).json(body);
};
