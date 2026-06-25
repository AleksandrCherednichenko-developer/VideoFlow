import { describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret } from "./encryptionService.js";

describe("encryptionService", () => {
  it("encrypts and decrypts secrets with AES-256-GCM", () => {
    const key = "test-encryption-key-test-encryption-key";
    const encrypted = encryptSecret("oauth-token-value", key);

    expect(encrypted).not.toBe("oauth-token-value");
    expect(decryptSecret(encrypted, key)).toBe("oauth-token-value");
  });

  it("rejects invalid encrypted payloads", () => {
    expect(() =>
      decryptSecret("invalid", "test-encryption-key-test-encryption-key"),
    ).toThrow("Invalid encrypted secret format");
  });
});
