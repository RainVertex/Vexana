// Loads platform-managed secrets for the apply path. Today the only source
// is env vars prefixed with SCAFFOLDER_SECRET_; PR plan calls out a future
// per-user GitHub OAuth token override, which would slot in here.

const PREFIX = "SCAFFOLDER_SECRET_";

export function loadEnvSecrets(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith(PREFIX) && v) {
      out[k.slice(PREFIX.length)] = v;
    }
  }
  return out;
}
