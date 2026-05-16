// Shared HMAC verification for GitHub App webhooks. Accepts either the raw
// Buffer (when express.raw() is in use) or a string. Returns true only when
// the signature header is present, well-formed, and a length-safe match.

import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyGitHubSignature(
  secret: string,
  body: Buffer | string,
  headerSig: string | undefined,
): boolean {
  if (!headerSig || !headerSig.startsWith("sha256=")) return false;
  const buf = typeof body === "string" ? Buffer.from(body, "utf8") : body;
  const expected = "sha256=" + createHmac("sha256", secret).update(buf).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(headerSig);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
