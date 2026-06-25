import { rateLimit } from "express-rate-limit";

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "TooManyRequests",
    message: "Too many auth requests. Try again later.",
  },
});
