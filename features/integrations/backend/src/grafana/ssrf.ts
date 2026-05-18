// SSRF guard for admin-entered Grafana baseUrls. Admin trust covers the
// common misuse, but defense in depth: an admin who copy/pastes the wrong
// URL — or whose account gets compromised — shouldn't be able to point the
// platform at internal services (metadata endpoints, Redis, the admin API
// of another service on the VPS).
//
// TOCTOU caveat: the resolved address is checked at connect time only. A
// malicious DNS could resolve the same hostname to a public address now and
// a private one on the next fetch. Mitigation for v2: resolve + pin the IP
// per request, or run egress through a filtering proxy. v1 catches the
// common cases (typos, simple compromise).

import dns from "node:dns/promises";
import type { LookupAddress } from "node:dns";

const PRIVATE_V4: RegExp[] = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
];

function isPrivateV6(addr: string): boolean {
  const a = addr.toLowerCase();
  if (a === "::1") return true; // loopback
  if (a.startsWith("fc") || a.startsWith("fd")) return true; // ULA
  if (a.startsWith("fe80")) return true; // link-local
  return false;
}

export class PrivateBaseUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrivateBaseUrlError";
  }
}

/**
 * Throws PrivateBaseUrlError if baseUrl resolves to a private/loopback/
 * link-local address, unless ALLOW_PRIVATE_GRAFANA_BASEURL=true. No-op for
 * URLs that fail to parse or resolve — the surrounding caller will get a
 * useful error from the actual fetch.
 */
export async function assertNonPrivateHost(baseUrl: string): Promise<void> {
  if (process.env.ALLOW_PRIVATE_GRAFANA_BASEURL === "true") return;

  let host: string;
  try {
    host = new URL(baseUrl).hostname;
  } catch {
    return;
  }
  if (!host) return;

  let records: LookupAddress[];
  try {
    records = await dns.lookup(host, { all: true });
  } catch {
    // DNS failure — let the downstream fetch surface the error verbatim
    // rather than masking it with an SSRF rejection.
    return;
  }

  for (const r of records) {
    if (r.family === 4 && PRIVATE_V4.some((re) => re.test(r.address))) {
      throw new PrivateBaseUrlError(
        `baseUrl ${baseUrl} resolves to private IPv4 ${r.address}; set ALLOW_PRIVATE_GRAFANA_BASEURL=true to allow.`,
      );
    }
    if (r.family === 6 && isPrivateV6(r.address)) {
      throw new PrivateBaseUrlError(
        `baseUrl ${baseUrl} resolves to private IPv6 ${r.address}; set ALLOW_PRIVATE_GRAFANA_BASEURL=true to allow.`,
      );
    }
  }
}
