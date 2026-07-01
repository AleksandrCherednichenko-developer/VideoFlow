import { describe, expect, it, vi } from "vitest";
import type { S3Client } from "@aws-sdk/client-s3";

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

  it("downloads object bodies as buffers", async () => {
    const { getObjectBuffer } = await importR2ClientWithEnv({});
    const send = vi.fn().mockResolvedValue({
      Body: {
        transformToByteArray: async () => new Uint8Array([1, 2, 3]),
      },
    });
    const client = { send } as unknown as S3Client;

    const buffer = await getObjectBuffer(client, "bucket", "key.mp4");

    expect(buffer).toEqual(Buffer.from([1, 2, 3]));
    expect(send).toHaveBeenCalledOnce();
  });

  it("returns null when downloaded object is missing", async () => {
    const { getObjectBuffer } = await importR2ClientWithEnv({});
    const send = vi.fn().mockRejectedValue({
      name: "NotFound",
    });
    const client = { send } as unknown as S3Client;

    await expect(getObjectBuffer(client, "bucket", "missing.mp4")).resolves.toBeNull();
  });
});
