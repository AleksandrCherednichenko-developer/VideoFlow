import type { RequestHandler } from "express";

import { AppError } from "../errors/AppError.js";
import { verifyAccessToken } from "../../services/auth/tokenService.js";

export const authenticate: RequestHandler = (req, _res, next) => {
  const authorizationHeader = req.header("authorization");
  const token = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length)
    : undefined;

  if (token === undefined) {
    next(new AppError(401, "Unauthorized", "Missing access token"));
    return;
  }

  try {
    req.authUser = verifyAccessToken(token);
    next();
  } catch {
    next(new AppError(401, "Unauthorized", "Invalid access token"));
  }
};
