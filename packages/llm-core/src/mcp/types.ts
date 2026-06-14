import type { RegisteredTool } from "../toolRegistry";

// Decrypted-on-read config for one attached MCP server. The bytes fields stay encrypted; the
// connect/oauth code decrypts them only when it needs the plaintext.
export interface McpServerConfig {
  id: string;
  label: string;
  url: string;
  authKind: string; // "none" | "bearer" | "oauth"
  bearerToken: Uint8Array | null;
  oauthScope: string | null;
  oauthClientInfo: Uint8Array | null;
  oauthDiscovery: unknown;
  toolAllowlist: string[];
  toolPrefix: string;
}

// Where to send the OAuth dance: the callback the authorization server redirects back to, and the
// app URL to land the browser on once consent completes.
export interface McpResolveOptions {
  redirectUrl: string;
  redirectTo?: string;
}

export interface McpToolInfo {
  name: string;
  description: string;
}

export interface McpAuthPrompt {
  serverId: string;
  label: string;
  authUrl: string;
}

// The tools merged into an agent's tool set for one run/turn, plus servers that still need the
// caller to authorize, plus any non-fatal connection warnings. close() tears down every transport.
export interface McpToolset {
  tools: RegisteredTool[];
  needsAuth: McpAuthPrompt[];
  warnings: string[];
  close(): Promise<void>;
}
