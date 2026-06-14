import { randomBytes } from "node:crypto";
import { prisma, Prisma } from "@internal/db";
import type {
  OAuthClientProvider,
  OAuthDiscoveryState,
} from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformation,
  OAuthClientInformationFull,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { decryptSecret, encryptSecret } from "../crypto";
import type { McpServerConfig } from "./types";

const FLOW_TTL_MS = 10 * 60 * 1000;
const CLIENT_NAME = "Modular Engineering Platform";

export interface DbOAuthProviderArgs {
  server: McpServerConfig;
  userId: string;
  // Our OAuth callback the authorization server redirects back to.
  redirectUrl: string;
  // App URL to land the browser on after consent (carried through the flow row).
  redirectTo?: string;
  // Set on the callback path so codeVerifier()/token exchange can find the in-flight flow row.
  flowState?: string;
}

// Persists every piece of OAuth state the SDK asks for (dynamic client registration, PKCE verifier,
// tokens, discovery) in the database, scoped to one (server, user). Tokens and client secrets are
// encrypted at rest with the same AES-256-GCM helper used for provider keys. It never performs a
// browser redirect itself: redirectToAuthorization captures the URL so the caller can surface it.
export class DbOAuthClientProvider implements OAuthClientProvider {
  pendingAuthUrl: string | undefined;
  private currentState: string | undefined;
  private pendingVerifier: string | undefined;
  private clientInfoCache: OAuthClientInformationFull | OAuthClientInformation | undefined;

  constructor(private readonly args: DbOAuthProviderArgs) {
    this.currentState = args.flowState;
    if (args.server.oauthClientInfo) {
      try {
        this.clientInfoCache = JSON.parse(decryptSecret(args.server.oauthClientInfo));
      } catch {
        // A corrupt blob just forces re-registration.
      }
    }
  }

  get redirectUrl(): string {
    return this.args.redirectUrl;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      redirect_uris: [this.args.redirectUrl],
      client_name: CLIENT_NAME,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "client_secret_post",
      ...(this.args.server.oauthScope ? { scope: this.args.server.oauthScope } : {}),
    };
  }

  state(): string {
    if (!this.currentState) this.currentState = randomBytes(24).toString("base64url");
    return this.currentState;
  }

  clientInformation(): OAuthClientInformation | undefined {
    return this.clientInfoCache as OAuthClientInformation | undefined;
  }

  async saveClientInformation(info: OAuthClientInformationFull): Promise<void> {
    this.clientInfoCache = info;
    await prisma.agentMcpServer.update({
      where: { id: this.args.server.id },
      data: { oauthClientInfo: new Uint8Array(encryptSecret(JSON.stringify(info))) },
    });
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    const row = await prisma.mcpOAuthToken.findUnique({
      where: { mcpServerId_userId: { mcpServerId: this.args.server.id, userId: this.args.userId } },
    });
    if (!row) return undefined;
    const expiresIn = row.expiresAt
      ? Math.max(0, Math.floor((row.expiresAt.getTime() - Date.now()) / 1000))
      : undefined;
    return {
      access_token: decryptSecret(row.accessToken),
      token_type: row.tokenType ?? "Bearer",
      ...(row.refreshToken ? { refresh_token: decryptSecret(row.refreshToken) } : {}),
      ...(expiresIn !== undefined ? { expires_in: expiresIn } : {}),
      ...(row.scope ? { scope: row.scope } : {}),
    };
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    const expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null;
    const data = {
      accessToken: new Uint8Array(encryptSecret(tokens.access_token)),
      refreshToken: tokens.refresh_token
        ? new Uint8Array(encryptSecret(tokens.refresh_token))
        : null,
      tokenType: tokens.token_type ?? null,
      scope: tokens.scope ?? null,
      expiresAt,
    };
    await prisma.mcpOAuthToken.upsert({
      where: { mcpServerId_userId: { mcpServerId: this.args.server.id, userId: this.args.userId } },
      update: data,
      create: { mcpServerId: this.args.server.id, userId: this.args.userId, ...data },
    });
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    this.pendingAuthUrl = authorizationUrl.toString();
    const state = this.state();
    // saveCodeVerifier always runs before this in the SDK; guard anyway so a missing verifier does
    // not write a useless flow row.
    if (!this.pendingVerifier) return;
    const codeVerifier = new Uint8Array(encryptSecret(this.pendingVerifier));
    const redirectTo = this.args.redirectTo ?? this.args.redirectUrl;
    const expiresAt = new Date(Date.now() + FLOW_TTL_MS);
    await prisma.mcpOAuthFlow.upsert({
      where: { id: state },
      update: { codeVerifier, redirectTo, expiresAt },
      create: {
        id: state,
        mcpServerId: this.args.server.id,
        userId: this.args.userId,
        codeVerifier,
        redirectTo,
        expiresAt,
      },
    });
  }

  saveCodeVerifier(codeVerifier: string): void {
    this.pendingVerifier = codeVerifier;
  }

  async codeVerifier(): Promise<string> {
    if (this.pendingVerifier) return this.pendingVerifier;
    if (!this.currentState) throw new Error("No OAuth flow state to load the code verifier from");
    const flow = await prisma.mcpOAuthFlow.findUnique({ where: { id: this.currentState } });
    if (!flow) throw new Error("OAuth flow not found or expired");
    return decryptSecret(flow.codeVerifier);
  }

  async saveDiscoveryState(state: OAuthDiscoveryState): Promise<void> {
    await prisma.agentMcpServer.update({
      where: { id: this.args.server.id },
      data: { oauthDiscovery: state as unknown as Prisma.InputJsonValue },
    });
  }

  discoveryState(): OAuthDiscoveryState | undefined {
    return (this.args.server.oauthDiscovery as OAuthDiscoveryState | null) ?? undefined;
  }

  async invalidateCredentials(
    scope: "all" | "client" | "tokens" | "verifier" | "discovery",
  ): Promise<void> {
    if (scope === "all" || scope === "tokens") {
      await prisma.mcpOAuthToken.deleteMany({
        where: { mcpServerId: this.args.server.id, userId: this.args.userId },
      });
    }
    if ((scope === "all" || scope === "verifier") && this.currentState) {
      await prisma.mcpOAuthFlow.deleteMany({ where: { id: this.currentState } });
    }
    if (scope === "all" || scope === "client") {
      this.clientInfoCache = undefined;
      await prisma.agentMcpServer.update({
        where: { id: this.args.server.id },
        data: { oauthClientInfo: null },
      });
    }
    if (scope === "all" || scope === "discovery") {
      await prisma.agentMcpServer.update({
        where: { id: this.args.server.id },
        data: { oauthDiscovery: Prisma.DbNull },
      });
    }
  }
}
