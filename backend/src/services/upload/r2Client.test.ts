import { describe, expect, it, vi } from "vitest";

type MockEnv = Record<string, string | undefined>;

async function importR2ClientWithEnv(mockEnv: MockEnv) {
  vi.resetModules();
  vi.doMock("../../config/env.js", () => ({
    env: {
      R2_ACCOUNT_ID: "test-account-id",
      R2_ACCESS_KEY: "test-access-key",
      R2_SECRET_KEY: "test-secret-key",
      R2_BUCKET: "videoflow-videos",
      R2_PUBLIC_URL: "",
      ...mockEnv,
    },
  }));

  return import("./r2Client.js");
}

describe("r2Client", () => {
  it("treats empty required R2 env values as missing", async () => {
    const { getR2Config } = await importR2ClientWithEnv({
      R2_ACCESS_KEY: "",
    });

    expect(() => getR2Config()).toThrowError(
      "Cloudflare R2 storage is not configured",
    );
  });

  it("trims configured values and public URL trailing slash", async () => {
    const { getR2Config } = await importR2ClientWithEnv({
      R2_ACCOUNT_ID: " test-account-id ",
      R2_ACCESS_KEY: " test-access-key ",
      R2_SECRET_KEY: " test-secret-key ",
      R2_BUCKET: " videoflow-videos ",
      R2_PUBLIC_URL: "https://cdn.example.com/",
    });

    expect(getR2Config()).toEqual({
      accountId: "test-account-id",
      accessKeyId: "test-access-key",
      secretAccessKey: "test-secret-key",
      bucket: "videoflow-videos",
      publicUrl: "https://cdn.example.com",
    });
  });
});
