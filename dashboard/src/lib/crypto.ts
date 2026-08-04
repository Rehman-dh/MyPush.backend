import crypto from "crypto";

/**
 * AES-256-GCM encryption for FCM service-account JSON at rest.
 * Key = CREDENTIALS_ENCRYPTION_KEY (32-byte hex → 64 chars).
 */

export interface EncryptedBlob {
  iv: string; // hex
  tag: string; // hex (GCM auth tag)
  data: string; // hex ciphertext
}

function getKey(): Buffer {
  const hex = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY must be 32-byte hex (64 chars). Generate: openssl rand -hex 32"
    );
  }
  return Buffer.from(hex, "hex");
}

export function encryptJson(obj: unknown): EncryptedBlob {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(obj), "utf8");
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString("hex"), tag: tag.toString("hex"), data: enc.toString("hex") };
}

export function decryptJson<T = unknown>(blob: EncryptedBlob): T {
  const key = getKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(blob.iv, "hex"));
  decipher.setAuthTag(Buffer.from(blob.tag, "hex"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(blob.data, "hex")),
    decipher.final(),
  ]);
  return JSON.parse(dec.toString("utf8")) as T;
}

/** SHA-256 hash (hex) — for storing secret REST keys. */
export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/** Generate app credentials. */
export function newPublicAppKey(): string {
  return "pub_" + crypto.randomBytes(18).toString("hex");
}
export function newSecretRestKey(): string {
  return "sk_" + crypto.randomBytes(24).toString("hex");
}
