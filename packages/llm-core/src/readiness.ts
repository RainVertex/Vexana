// A provider is "ready" when the key it needs is actually available. Local
// providers (Ollama) declare no apiKeyEnvVar and are always ready. Cloud
// providers are ready when an admin stored an in-app key, or when their env
// var is set in this deployment. Callers pass hasStoredKey so this stays a
// pure, synchronous check (the DB lookup happens once in the caller).
export function isProviderReady(
  provider: { apiKeyEnvVar: string | null },
  hasStoredKey: boolean,
): boolean {
  if (!provider.apiKeyEnvVar) return true;
  if (hasStoredKey) return true;
  return Boolean(process.env[provider.apiKeyEnvVar]);
}
