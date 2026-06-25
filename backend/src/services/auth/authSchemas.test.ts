import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "./authSchemas.js";

describe("authSchemas", () => {
  it("normalizes registration email and applies UTC timezone by default", () => {
    const input = registerSchema.parse({
      email: "USER@Example.COM",
      password: "password123",
    });

    expect(input).toEqual({
      email: "user@example.com",
      password: "password123",
      timezone: "UTC",
    });
  });

  it("rejects short registration passwords", () => {
    expect(() =>
      registerSchema.parse({
        email: "user@example.com",
        password: "short",
      }),
    ).toThrow();
  });

  it("normalizes login email", () => {
    const input = loginSchema.parse({
      email: "USER@Example.COM",
      password: "password123",
    });

    expect(input.email).toBe("user@example.com");
  });
});
