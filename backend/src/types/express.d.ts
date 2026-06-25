import type { AuthenticatedUser } from "../services/auth/tokenService.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}

export {};
