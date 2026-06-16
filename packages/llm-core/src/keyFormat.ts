// Shape checks on platform. Obvious non-key values are rejected before its
// encrypted and stored. These wont catch a wrong key
// (only a live call to the provider proves that).

export function validateProviderKeyFormat(providerKind: string, apiKey: string): string | null {
  const invalid = "Invalid API key format.";
  const key = apiKey.trim();
  if (key.length === 0) return invalid;
  if (/\s/.test(key)) return invalid;

  switch (providerKind) {
    case "openai":
      return /^sk-[A-Za-z0-9_-]{20,}$/.test(key) ? null : invalid;
    case "anthropic":
    case "anthropic-via-openai":
      return /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(key) ? null : invalid;
    case "gemini":
      return /^AIza[A-Za-z0-9_-]{35}$/.test(key) ? null : invalid;
    default:
      return key.length >= 8 ? null : invalid;
  }
}
