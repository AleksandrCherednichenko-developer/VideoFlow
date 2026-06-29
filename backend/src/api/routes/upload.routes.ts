import { Router } from "express";

import { authenticate } from "../middleware/authenticate.js";
import { AppError } from "../errors/AppError.js";
import {
  completeUploadSchema,
  presignUploadSchema,
} from "../../services/upload/uploadSchemas.js";
import {
  completeUpload,
  createPresignedUpload,
} from "../../services/upload/uploadService.js";

export const uploadRouter = Router();

uploadRouter.post(
  "/uploads/presign",
  authenticate,
  async (req, res, next) => {
    try {
      if (req.authUser === undefined) {
        throw new AppError(401, "Unauthorized", "Missing authenticated user");
      }

      const input = presignUploadSchema.parse(req.body);
      const result = await createPresignedUpload(input, req.authUser.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

uploadRouter.post(
  "/uploads/complete",
  authenticate,
  async (req, res, next) => {
    try {
      if (req.authUser === undefined) {
        throw new AppError(401, "Unauthorized", "Missing authenticated user");
      }

      const input = completeUploadSchema.parse(req.body);
      const result = await completeUpload(input, req.authUser.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);
