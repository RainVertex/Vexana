// Provider readiness check plus the role-aware messages shown when a provider
// has no key or chat has no usable model.
export function isProviderReady(
  provider: { apiKeyEnvVar: string | null },
  hasStoredKey: boolean,
): boolean {
  if (!provider.apiKeyEnvVar) return true;
  if (hasStoredKey) return true;
  return Boolean(process.env[provider.apiKeyEnvVar]);
}

export function providerKeyMissingMessage(isAdmin: boolean): string {
  return isAdmin
    ? "This provider has no API key set. Go to Admin -> AI / Models to add one."
    : "The assistant isn't set up yet. Please contact your administrator.";
}

export function assistantNotConfiguredMessage(isAdmin: boolean): string {
  return isAdmin
    ? "The assistant isn't set up yet. Go to Admin -> AI / Models to select a chat model and add its API key."
    : "The assistant isn't set up yet. Please contact your administrator.";
}
