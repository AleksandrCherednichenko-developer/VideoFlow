import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  startOAuth: vi.fn(),
  completeOAuthCallback: vi.fn(),
  connectVkCommunityAccount: vi.fn(),
  listAccounts: vi.fn(),
  disconnectAccount: vi.fn(),
}));

vi.mock("../middleware/authenticate.js", () => ({
  authenticate: (req: { authUser?: { id: string } }, res: unknown, next: () => void) => {
    req.authUser = {
      id: "11111111-1111-4111-8111-111111111111",
    };
    next();
  },
}));

vi.mock("../../services/oauth/accountService.js", () => serviceMocks);

import { createApp } from "../app.js";

const app = createApp();

describe("oauth routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.startOAuth.mockReturnValue({
      authorizationUrl: "https://oauth.example/authorize",
    });
    serviceMocks.completeOAuthCallback.mockResolvedValue({
      id: "account-id",
    });
    serviceMocks.connectVkCommunityAccount.mockResolvedValue({
      id: "account-id",
      platform: "vk",
      externalAccountId: "12345",
      externalAccountName: "Test Community",
      expiresAt: null,
      isExpired: false,
      isActive: true,
      createdAt: "2026-06-30T10:00:00.000Z",
      updatedAt: "2026-06-30T10:00:00.000Z",
    });
    serviceMocks.listAccounts.mockResolvedValue([
      {
        id: "account-id",
        platform: "vk",
        externalAccountId: "12345",
        externalAccountName: "Test Community",
        expiresAt: null,
        isExpired: false,
        isActive: true,
        createdAt: "2026-06-30T10:00:00.000Z",
        updatedAt: "2026-06-30T10:00:00.000Z",
      },
    ]);
    serviceMocks.disconnectAccount.mockResolvedValue(undefined);
  });

  it("starts OAuth for authenticated users", async () => {
    const response = await request(app).get("/oauth/youtube/start").expect(200);

    expect(response.body).toEqual({
      authorizationUrl: "https://oauth.example/authorize",
    });
    expect(serviceMocks.startOAuth).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "youtube",
    );
  });

  it("redirects callback success to accounts", async () => {
    const response = await request(app)
      .get("/oauth/youtube/callback")
      .query({
        code: "code",
        state: "state",
      })
      .expect(302);

    expect(serviceMocks.completeOAuthCallback).toHaveBeenCalledWith(
      "youtube",
      "code",
      "state",
    );
    expect(response.headers.location).toBe(
      "http://localhost:5173/accounts?oauth=connected&platform=youtube",
    );
  });

  it("redirects callback provider errors to accounts", async () => {
    const response = await request(app)
      .get("/oauth/youtube/callback")
      .query({
        error: "access_denied",
      })
      .expect(302);

    expect(response.headers.location).toBe(
      "http://localhost:5173/accounts?oauth=error&platform=youtube&code=access_denied",
    );
  });

  it("connects VK community accounts for authenticated users", async () => {
    const response = await request(app)
      .post("/accounts/vk/connect")
      .send({
        groupId: "12345",
        accessToken: "vk-community-token",
      })
      .expect(200);

    expect(serviceMocks.connectVkCommunityAccount).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "12345",
      "vk-community-token",
    );
    expect(response.body).toMatchObject({
      platform: "vk",
      externalAccountId: "12345",
    });
  });

  it("rejects invalid VK community connect payloads", async () => {
    await request(app)
      .post("/accounts/vk/connect")
      .send({
        groupId: "",
        accessToken: "vk-community-token",
      })
      .expect(400);
  });

  it("lists accounts for the current user", async () => {
    const response = await request(app).get("/accounts").expect(200);

    expect(response.body.accounts).toHaveLength(1);
    expect(serviceMocks.listAccounts).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("disconnects an account for the current user", async () => {
    await request(app).delete("/accounts/vk").expect(204);

    expect(serviceMocks.disconnectAccount).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "vk",
    );
  });

  it("rejects unsupported OAuth platforms", async () => {
    await request(app).get("/oauth/vk/start").expect(400);
    await request(app).get("/oauth/instagram/start").expect(400);
  });
});
