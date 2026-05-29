import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { prisma } from "@internal/db";

// Encrypted-at-rest provider keys for agents. Format on disk:
// <iv (12 bytes)> | <ciphertext> | <auth tag (16 bytes)>
// All packed into the Secret.encryptedValue Bytes column. AES-256-GCM with
// a master key from APP_SECRET_MASTER_KEY (32 bytes, hex or base64). Never
// store plaintext anywhere, the Secret table only holds the encrypted blob.
//
// The master key fail-fasts at first use rather than at boot so test/dev
// environments without secrets configured can still start the server. If
// any code path that creates or reads a Secret runs without the env var
// it throws with an actionable message.

const ALGORITHM = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

let cachedMasterKey: Buffer | null = null;

function masterKey(): Buffer {
  if (cachedMasterKey) return cachedMasterKey;
  const raw = process.env.APP_SECRET_MASTER_KEY;
  if (!raw) {
    throw new Error(
      "APP_SECRET_MASTER_KEY is not set. Generate one with: " +
        "node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  // Accept hex (64 chars) or base64. Both must decode to 32 bytes.
  let buf: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    buf = Buffer.from(raw, "hex");
  } else {
    buf = Buffer.from(raw, "base64");
  }
  if (buf.length !== 32) {
    throw new Error("APP_SECRET_MASTER_KEY must decode to 32 bytes (hex or base64)");
  }
  cachedMasterKey = buf;
  return buf;
}

export function encryptSecret(plain: string): Buffer {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGORITHM, masterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ciphertext, tag]);
}

export function decryptSecret(blob: Buffer | Uint8Array): string {
  // Prisma's Bytes columns deserialize as Uint8Array. we accept both for
  // ergonomics. Wrapping in a Buffer view (zero-copy) lets us use the
  // subarray helpers and Buffer.concat below.
  const buf = Buffer.isBuffer(blob)
    ? blob
    : Buffer.from(blob.buffer, blob.byteOffset, blob.byteLength);
  if (buf.length < IV_LEN + TAG_LEN) {
    throw new Error("Secret blob too short — corrupt or wrong format");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(buf.length - TAG_LEN);
  const ciphertext = buf.subarray(IV_LEN, buf.length - TAG_LEN);
  const decipher = createDecipheriv(ALGORITHM, masterKey(), iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}

/** Resolve the API key an agent should use to talk to its provider. */
export async function resolveProviderApiKey(args: {
  agentSecretId: string | null;
  providerSlug: string;
  apiKeyEnvVar: string | null;
}): Promise<string | null> {
  if (args.agentSecretId) {
    const secret = await prisma.secret.findUnique({
      where: { id: args.agentSecretId },
      select: { encryptedValue: true },
    });
    if (!secret) {
      throw new Error(`Secret ${args.agentSecretId} not found (was it deleted?)`);
    }
    return decryptSecret(secret.encryptedValue);
  }
  if (args.apiKeyEnvVar) {
    const fromEnv = process.env[args.apiKeyEnvVar];
    if (!fromEnv) {
      throw new Error(
        `Missing env var ${args.apiKeyEnvVar} required by provider '${args.providerSlug}'`,
      );
    }
    return fromEnv;
  }
  return null;
}
