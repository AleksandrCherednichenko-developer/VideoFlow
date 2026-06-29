import { Router } from "express";

import { AppError } from "../errors/AppError.js";
import { authenticate } from "../middleware/authenticate.js";
import {
  createPublicationSchema,
  publicationIdParamsSchema,
} from "../../services/publications/publicationSchemas.js";
import {
  createPublication,
  deletePublication,
  getPublication,
  listPublications,
  retryPublication,
} from "../../services/publications/publicationService.js";

export const publicationRouter = Router();

function getAuthenticatedUserId(req: {
  authUser?: { id: string };
}): string {
  if (req.authUser === undefined) {
    throw new AppError(401, "Unauthorized", "Missing authenticated user");
  }

  return req.authUser.id;
}

publicationRouter.post(
  "/publications",
  authenticate,
  async (req, res, next) => {
    try {
      const userId = getAuthenticatedUserId(req);
      const input = createPublicationSchema.parse(req.body);
      const publication = await createPublication(input, userId);

      res.status(201).json({
        publication,
      });
    } catch (error) {
      next(error);
    }
  },
);

publicationRouter.get("/publications", authenticate, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const publications = await listPublications(userId);

    res.json({
      publications,
    });
  } catch (error) {
    next(error);
  }
});

publicationRouter.get(
  "/publications/:id",
  authenticate,
  async (req, res, next) => {
    try {
      const userId = getAuthenticatedUserId(req);
      const params = publicationIdParamsSchema.parse(req.params);
      const publication = await getPublication(userId, params.id);

      res.json({
        publication,
      });
    } catch (error) {
      next(error);
    }
  },
);

publicationRouter.post(
  "/publications/:id/retry",
  authenticate,
  async (req, res, next) => {
    try {
      const userId = getAuthenticatedUserId(req);
      const params = publicationIdParamsSchema.parse(req.params);
      const publication = await retryPublication(userId, params.id);

      res.json({
        publication,
      });
    } catch (error) {
      next(error);
    }
  },
);

publicationRouter.delete(
  "/publications/:id",
  authenticate,
  async (req, res, next) => {
    try {
      const userId = getAuthenticatedUserId(req);
      const params = publicationIdParamsSchema.parse(req.params);

      await deletePublication(userId, params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);
