import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createRequestLogger, sanitizeRequestUrl } from "./requestLogger.js";

function createLoggedApp(logs: string[]): express.Express {
  const app = express();

  app.use(
    createRequestLogger({
      write(message) {
        logs.push(message);
      },
    }),
  );
  app.get("/oauth/callback", (_request, response) => {
    response.status(200).send("ok");
  });

  return app;
}

describe("requestLogger", () => {
  it("redacts sensitive query values while preserving useful log fields", async () => {
    const logs: string[] = [];
    const app = createLoggedApp(logs);

    await request(app)
      .get("/oauth/callback")
      .query({
        code: "oauth-code-fixture",
        state: "oauth-state-fixture",
        next: "accounts",
      })
      .set("User-Agent", "VideoFlow-Test")
      .set("Referer", "https://app.example/accounts")
      .expect(200);

    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain("GET");
    expect(logs[0]).toContain("200 2");
    expect(logs[0]).toContain("next=accounts");
    expect(logs[0]).toContain("https://app.example/accounts");
    expect(logs[0]).toContain("VideoFlow-Test");
    expect(logs[0]).toMatch(/response-time|\d+(?:\.\d+)? ms/);
    expect(logs[0]).not.toContain("oauth-code-fixture");
    expect(logs[0]).not.toContain("oauth-state-fixture");
  });

  it("redacts repeated sensitive keys case-insensitively", () => {
    const sanitized = sanitizeRequestUrl(
      "/oauth/callback?CoDe=first&code=second&TOKEN=third&safe=value",
    );

    expect(sanitized).toBe(
      "/oauth/callback?CoDe=%5BREDACTED%5D&code=%5BREDACTED%5D&TOKEN=%5BREDACTED%5D&safe=value",
    );
  });

  it("redacts percent-encoded sensitive values", () => {
    const sanitized = sanitizeRequestUrl(
      "/oauth/callback?state=fixture%2Fsecret%3Dvalue&next=accounts",
    );

    expect(sanitized).toBe(
      "/oauth/callback?state=%5BREDACTED%5D&next=accounts",
    );
    expect(sanitized).not.toContain("fixture");
  });

  it("redacts every supported sensitive query key", () => {
    const sanitized = sanitizeRequestUrl(
      "/oauth/callback?access_token=one&refresh_token=two&token=three&code=four&state=five",
    );

    expect(sanitized.match(/%5BREDACTED%5D/g)).toHaveLength(5);
    expect(sanitized).not.toMatch(/(?:one|two|three|four|five)/);
  });

  it("redacts a percent-encoded sensitive key", () => {
    expect(sanitizeRequestUrl("/oauth/callback?%63ode=fixture&next=accounts")).toBe(
      "/oauth/callback?code=%5BREDACTED%5D&next=accounts",
    );
  });

  it("leaves requests without sensitive query keys semantically unchanged", () => {
    expect(sanitizeRequestUrl("/accounts?page=2&sort=platform")).toBe(
      "/accounts?page=2&sort=platform",
    );
  });

  it("drops the entire query when a URL cannot be parsed", () => {
    expect(sanitizeRequestUrl("http://[?code=oauth-code-fixture")).toBe(
      "http://[",
    );
  });
});
