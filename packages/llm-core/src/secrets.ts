import { prisma } from "@internal/db";
import { decryptSecret } from "./crypto";
import { providerKeyMissingMessage } from "./readiness";

// Resolve a provider's API key: stored encrypted credential first, then its env var, else null.
export async function resolveProviderApiKey(args: {
  providerId: string;
  providerSlug: string;
  apiKeyEnvVar: string | null;
  isAdmin?: boolean;
}): Promise<string | null> {
  const stored = await prisma.providerCredential.findUnique({
    where: { providerId: args.providerId },
    select: { encryptedValue: true },
  });
  if (stored) return decryptSecret(stored.encryptedValue);

  if (args.apiKeyEnvVar) {
    const fromEnv = process.env[args.apiKeyEnvVar];
    if (!fromEnv) {
      throw new Error(providerKeyMissingMessage(args.isAdmin ?? false));
    }
    return fromEnv;
  }
  return null;
}
