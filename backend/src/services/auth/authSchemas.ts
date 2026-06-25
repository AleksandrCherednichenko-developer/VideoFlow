import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  timezone: z.string().min(1).max(64).default("UTC"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;
