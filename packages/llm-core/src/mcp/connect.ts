import { prisma } from "@internal/db";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { auth, UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { decryptSecret } from "../crypto";
import type { RegisteredTool } from "../toolRegistry";
import { DbOAuthClientProvider } from "./oauthProvider";
import type { McpResolveOptions, McpServerConfig, McpToolInfo, McpToolset } from "./types";

// Builds the in-memory config the connect path needs from a persisted AgentMcpServer row.
export function toMcpServerConfig(row: {
  id: string;
  label: string;
  url: string;
  authKind: string;
  bearerToken: Uint8Array | null;
  oauthScope: string | null;
  oauthClientInfo: Uint8Array | null;
  oauthDiscovery: unknown;
  toolAllowlist: unknown;
  toolPrefix: string;
}): McpServerConfig {
  return {
    id: row.id,
    label: row.label,
    url: row.url,
    authKind: row.authKind,
    bearerToken: row.bearerToken,
    oauthScope: row.oauthScope,
    oauthClientInfo: row.oauthClientInfo,
    oauthDiscovery: row.oauthDiscovery ?? null,
    toolAllowlist: Array.isArray(row.toolAllowlist) ? (row.toolAllowlist as string[]) : [],
    toolPrefix: row.toolPrefix,
  };
}

type ConnectResult =
  | { status: "connected"; client: Client; close: () => Promise<void> }
  | { status: "needs_auth"; authUrl: string; close: () => Promise<void> }
  | { status: "error"; message: string };

async function connectMcp(
  server: McpServerConfig,
  userId: string | null,
  opts: McpResolveOptions,
): Promise<ConnectResult> {
  let url: URL;
  try {
    url = new URL(server.url);
  } catch {
    return { status: "error", message: `Invalid URL: ${server.url}` };
  }

  let provider: DbOAuthClientProvider | undefined;
  let transportOpts: ConstructorParameters<typeof StreamableHTTPClientTransport>[1] = {};
  if (server.authKind === "bearer" && server.bearerToken) {
    transportOpts = {
      requestInit: { headers: { Authorization: `Bearer ${decryptSecret(server.bearerToken)}` } },
    };
  } else if (server.authKind === "oauth") {
    if (!userId)
      return { status: "error", message: "OAuth MCP server requires an interactive user" };
    provider = new DbOAuthClientProvider({
      server,
      userId,
      redirectUrl: opts.redirectUrl,
      redirectTo: opts.redirectTo,
    });
    transportOpts = { authProvider: provider };
  }

  const transport = new StreamableHTTPClientTransport(url, transportOpts);
  const client = new Client({ name: "mep-agent", version: "1.0.0" });
  const close = async () => {
    try {
      await transport.close();
    } catch {
      // A failed teardown should never mask the real result.
    }
  };

  try {
    await client.connect(transport);
    return { status: "connected", client, close };
  } catch (err) {
    if (err instanceof UnauthorizedError && provider?.pendingAuthUrl) {
      return { status: "needs_auth", authUrl: provider.pendingAuthUrl, close };
    }
    await close();
    return { status: "error", message: err instanceof Error ? err.message : String(err) };
  }
}

function sanitizeName(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);
  return cleaned.length > 0 ? cleaned : "tool";
}

// Collapse an MCP CallTool result into a plain value the chat/agent loop can JSON-stringify.
function flattenToolResult(res: Awaited<ReturnType<Client["callTool"]>>): unknown {
  if (!("content" in res) && "toolResult" in res) {
    return (res as { toolResult: unknown }).toolResult;
  }
  const content = (res as { content?: Array<Record<string, unknown>> }).content ?? [];
  const texts: string[] = [];
  const others: unknown[] = [];
  for (const c of content) {
    if (c.type === "text" && typeof c.text === "string") texts.push(c.text);
    else if (c.type === "resource") others.push(c.resource);
    else others.push(c);
  }
  const text = texts.join("\n");
  const payload = others.length === 0 ? text : { text: text || undefined, items: others };
  return (res as { isError?: boolean }).isError ? { isError: true, result: payload } : payload;
}

async function listAndWrap(client: Client, server: McpServerConfig): Promise<RegisteredTool[]> {
  const { tools } = await client.listTools();
  const allow = new Set(server.toolAllowlist);
  const wrapped: RegisteredTool[] = [];
  for (const t of tools) {
    if (allow.size > 0 && !allow.has(t.name)) continue;
    const name = sanitizeName(`mcp_${server.toolPrefix}_${t.name}`);
    wrapped.push({
      id: `mcp:${server.id}:${t.name}`,
      group: `mcp:${server.id}`,
      openaiDef: {
        type: "function",
        function: {
          name,
          description: t.description ?? "",
          parameters: (t.inputSchema ?? { type: "object", properties: {} }) as Record<
            string,
            unknown
          >,
        },
      },
      handler: async (args) => {
        const res = await client.callTool({
          name: t.name,
          arguments: (args ?? {}) as Record<string, unknown>,
        });
        return flattenToolResult(res);
      },
    });
  }
  return wrapped;
}

// Connect to every enabled server, merge their tools, and report servers that still need the caller
// to authorize. A server that errors (or, in an autonomous run, needs OAuth) is skipped with a
// warning so the run proceeds with whatever tools it could load.
export async function openMcpToolset(
  servers: McpServerConfig[],
  userId: string | null,
  opts: McpResolveOptions,
): Promise<McpToolset> {
  const tools: RegisteredTool[] = [];
  const needsAuth: McpToolset["needsAuth"] = [];
  const warnings: string[] = [];
  const opened: Array<() => Promise<void>> = [];

  await Promise.all(
    servers.map(async (server) => {
      if (server.authKind === "oauth" && !userId) {
        warnings.push(`${server.label}: OAuth requires an interactive user, skipped`);
        return;
      }
      const r = await connectMcp(server, userId, opts);
      if (r.status === "connected") {
        try {
          tools.push(...(await listAndWrap(r.client, server)));
          opened.push(r.close);
          void prisma.agentMcpServer
            .update({
              where: { id: server.id },
              data: { lastConnectedAt: new Date(), lastError: null },
            })
            .catch(() => {});
        } catch (e) {
          warnings.push(`${server.label}: ${e instanceof Error ? e.message : String(e)}`);
          await r.close();
        }
      } else if (r.status === "needs_auth") {
        needsAuth.push({ serverId: server.id, label: server.label, authUrl: r.authUrl });
        await r.close();
      } else {
        warnings.push(`${server.label}: ${r.message}`);
        void prisma.agentMcpServer
          .update({ where: { id: server.id }, data: { lastError: r.message.slice(0, 500) } })
          .catch(() => {});
      }
    }),
  );

  return {
    tools,
    needsAuth,
    warnings,
    async close() {
      await Promise.all(opened.map((c) => c()));
    },
  };
}

// The agents API route that finishes the OAuth dance. Callers build the redirect URL from this so
// the value the authorization server is registered with always matches the mounted route.
export const MCP_OAUTH_CALLBACK_PATH = "/api/agents/mcp/oauth/callback";

export function mcpOAuthRedirectUrl(webOrigin: string): string {
  return `${webOrigin.replace(/\/+$/, "")}${MCP_OAUTH_CALLBACK_PATH}`;
}

// Load an agent's enabled MCP servers and open a toolset for them. Returns null when the agent has
// no enabled servers so callers can skip the work entirely.
export async function openAgentMcpToolset(
  agentId: string,
  userId: string | null,
  opts: McpResolveOptions,
): Promise<McpToolset | null> {
  const rows = await prisma.agentMcpServer.findMany({ where: { agentId, enabled: true } });
  if (rows.length === 0) return null;
  return openMcpToolset(rows.map(toMcpServerConfig), userId, opts);
}

export type McpProbeResult =
  | { status: "ok"; tools: McpToolInfo[] }
  | { status: "needs_auth"; authUrl: string }
  | { status: "error"; message: string };

// Connect once and list the server's tools so the UI can populate the allowlist before saving.
export async function probeMcpServer(
  server: McpServerConfig,
  userId: string | null,
  opts: McpResolveOptions,
): Promise<McpProbeResult> {
  const r = await connectMcp(server, userId, opts);
  if (r.status === "connected") {
    try {
      const { tools } = await r.client.listTools();
      return {
        status: "ok",
        tools: tools.map((t) => ({ name: t.name, description: t.description ?? "" })),
      };
    } catch (e) {
      return { status: "error", message: e instanceof Error ? e.message : String(e) };
    } finally {
      await r.close();
    }
  }
  if (r.status === "needs_auth") {
    await r.close();
    return { status: "needs_auth", authUrl: r.authUrl };
  }
  return { status: "error", message: r.message };
}

// Finish the OAuth dance from the callback route: exchange the code for tokens (stored per user) and
// clear the in-flight flow row. The flow row is keyed by state and carries the server + user.
export async function completeMcpOAuth(args: {
  userId: string;
  code: string;
  state: string;
  redirectUrl: string;
}): Promise<{ ok: true; redirectTo: string } | { ok: false; error: string }> {
  const flow = await prisma.mcpOAuthFlow.findUnique({ where: { id: args.state } });
  if (!flow || flow.userId !== args.userId) return { ok: false, error: "OAuth flow not found" };
  if (flow.expiresAt.getTime() < Date.now()) {
    await prisma.mcpOAuthFlow.delete({ where: { id: flow.id } }).catch(() => {});
    return { ok: false, error: "OAuth flow expired" };
  }
  const row = await prisma.agentMcpServer.findUnique({ where: { id: flow.mcpServerId } });
  if (!row) return { ok: false, error: "MCP server not found" };

  const provider = new DbOAuthClientProvider({
    server: toMcpServerConfig(row),
    userId: args.userId,
    redirectUrl: args.redirectUrl,
    flowState: args.state,
  });
  try {
    const result = await auth(provider, { serverUrl: row.url, authorizationCode: args.code });
    if (result !== "AUTHORIZED") return { ok: false, error: `Unexpected auth result: ${result}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  const redirectTo = flow.redirectTo;
  await prisma.mcpOAuthFlow.delete({ where: { id: flow.id } }).catch(() => {});
  return { ok: true, redirectTo };
}
