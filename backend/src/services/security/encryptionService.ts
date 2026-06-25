import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;

export interface EncryptedValue {
  iv: string;
  authTag: string;
  ciphertext: string;
}

function normalizeEncryptionKey(key: string): Buffer {
  return crypto.createHash("sha256").update(key).digest();
}

function getEncryptionKey(key: string | undefined): string {
  const encryptionKey = key ?? process.env.ENCRYPTION_KEY;

  if (encryptionKey === undefined || encryptionKey.length < 32) {
    throw new Error("ENCRYPTION_KEY must be at least 32 characters");
  }

  return encryptionKey;
}

export function encryptSecret(plaintext: string, key?: string): string {
  const encryptionKey = getEncryptionKey(key);
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    normalizeEncryptionKey(encryptionKey),
    iv,
    {
      authTagLength: AUTH_TAG_LENGTH_BYTES,
    },
  );

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const encryptedValue: EncryptedValue = {
    iv: iv.toString("base64url"),
    authTag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  };

  return [
    encryptedValue.iv,
    encryptedValue.authTag,
    encryptedValue.ciphertext,
  ].join(".");
}

export function decryptSecret(encrypted: string, key?: string): string {
  const encryptionKey = getEncryptionKey(key);
  const parts = encrypted.split(".");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted secret format");
  }

  const [iv, authTag, ciphertext] = parts;

  if (
    iv === undefined ||
    authTag === undefined ||
    ciphertext === undefined
  ) {
    throw new Error("Invalid encrypted secret payload");
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    normalizeEncryptionKey(encryptionKey),
    Buffer.from(iv, "base64url"),
    {
      authTagLength: AUTH_TAG_LENGTH_BYTES,
    },
  );

  decipher.setAuthTag(Buffer.from(authTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
