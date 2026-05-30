import { prisma } from "@internal/db";
import { decryptSecret } from "./crypto";

// Resolve the API key a provider should authenticate with. Precedence:
//   1. An admin-entered, encrypted ProviderCredential stored in the DB.
//   2. The env var named on the provider row (e.g. ANTHROPIC_API_KEY).
// Providers that need no key (local Ollama) leave apiKeyEnvVar null and have
// no stored credential, so they resolve to null.
export async function resolveProviderApiKey(args: {
  providerId: string;
  providerSlug: string;
  apiKeyEnvVar: string | null;
}): Promise<string | null> {
  const stored = await prisma.providerCredential.findUnique({
    where: { providerId: args.providerId },
    select: { encryptedValue: true },
  });
  if (stored) return decryptSecret(stored.encryptedValue);

  if (args.apiKeyEnvVar) {
    const fromEnv = process.env[args.apiKeyEnvVar];
    if (!fromEnv) {
      throw new Error(
        `Missing API key for provider '${args.providerSlug}': no in-app key set and env var ${args.apiKeyEnvVar} is unset`,
      );
    }
    return fromEnv;
  }
  return null;
}
