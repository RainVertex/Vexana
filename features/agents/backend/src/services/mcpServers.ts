import { prisma, Prisma } from "@internal/db";
import {
  completeMcpOAuth,
  encryptSecret,
  mcpOAuthRedirectUrl,
  probeMcpServer as probeMcp,
  toMcpServerConfig,
  type McpProbeResult,
} from "@internal/llm-core";
import type { AgentMcpServerSummary, McpAuthKind } from "@feature/agents-shared";
import type { CreateMcpServerInput, UpdateMcpServerInput } from "../dto";
import { NotFoundError } from "../errors";
import { agentRepository } from "../repositories/agents";
import { mcpServerRepository, type McpServerRow } from "../repositories/mcpServers";

function webOrigin(): string {
  return process.env.WEB_ORIGIN ?? "http://localhost:3010";
}

export function oauthRedirectUrl(): string {
  return mcpOAuthRedirectUrl(webOrigin());
}

// Where to send the browser after consent. Lands back on the agent page with a flag the UI uses to
// refresh the server's status.
function landingUrl(agentId: string): string {
  return `${webOrigin()}/agents/${agentId}?mcp_oauth=connected`;
}

function slugPrefix(label: string): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
  return base || "srv";
}

// Tool names are namespaced by prefix, so a prefix must be unique within one agent or two servers
// could emit colliding tool names.
async function uniquePrefix(agentId: string, desired: string, excludeId?: string): Promise<string> {
  const existing = await mcpServerRepository.listForAgent(agentId);
  const taken = new Set(existing.filter((s) => s.id !== excludeId).map((s) => s.toolPrefix));
  let prefix = desired;
  let i = 2;
  while (taken.has(prefix)) prefix = `${desired}_${i++}`;
  return prefix;
}

function toSummary(row: McpServerRow, oauthConnected: boolean): AgentMcpServerSummary {
  return {
    id: row.id,
    agentId: row.agentId,
    label: row.label,
    url: row.url,
    authKind: row.authKind as McpAuthKind,
    hasBearerToken: row.bearerToken != null,
    oauthScope: row.oauthScope,
    oauthConnected,
    toolAllowlist: Array.isArray(row.toolAllowlist) ? (row.toolAllowlist as string[]) : [],
    toolPrefix: row.toolPrefix,
    enabled: row.enabled,
    lastError: row.lastError,
    lastConnectedAt: row.lastConnectedAt ? row.lastConnectedAt.toISOString() : null,
  };
}

async function ensureAgent(agentId: string): Promise<void> {
  const agent = await agentRepository.findBasic(agentId);
  if (!agent) throw new NotFoundError("Agent not found");
}

async function findOwned(agentId: string, serverId: string): Promise<McpServerRow> {
  const row = await mcpServerRepository.findById(serverId);
  if (!row || row.agentId !== agentId) throw new NotFoundError("MCP server not found");
  return row;
}

export async function listMcpServers(
  agentId: string,
  userId: string | null,
): Promise<AgentMcpServerSummary[]> {
  await ensureAgent(agentId);
  const rows = await mcpServerRepository.listForAgent(agentId);
  return Promise.all(
    rows.map(async (r) => toSummary(r, await mcpServerRepository.oauthConnected(r.id, userId))),
  );
}

export async function createMcpServer(
  agentId: string,
  input: CreateMcpServerInput,
): Promise<AgentMcpServerSummary> {
  await ensureAgent(agentId);
  const authKind = input.authKind ?? "none";
  const prefix = await uniquePrefix(agentId, slugPrefix(input.toolPrefix?.trim() || input.label));
  const row = await mcpServerRepository.create({
    agentId,
    label: input.label.trim(),
    url: input.url.trim(),
    authKind,
    bearerToken:
      authKind === "bearer" && input.bearerToken
        ? new Uint8Array(encryptSecret(input.bearerToken))
        : null,
    oauthScope: input.oauthScope ?? null,
    toolAllowlist: input.toolAllowlist ?? [],
    toolPrefix: prefix,
    enabled: input.enabled ?? true,
  });
  return toSummary(row, false);
}

export async function updateMcpServer(
  agentId: string,
  serverId: string,
  input: UpdateMcpServerInput,
  userId: string | null,
): Promise<AgentMcpServerSummary> {
  const existing = await findOwned(agentId, serverId);

  const data: Prisma.AgentMcpServerUncheckedUpdateInput = {};
  if (input.label !== undefined) data.label = input.label.trim();
  if (input.url !== undefined) data.url = input.url.trim();
  if (input.authKind !== undefined) data.authKind = input.authKind;
  if (input.oauthScope !== undefined) data.oauthScope = input.oauthScope;
  if (input.toolAllowlist !== undefined) data.toolAllowlist = input.toolAllowlist;
  if (input.enabled !== undefined) data.enabled = input.enabled;
  if (input.toolPrefix !== undefined && input.toolPrefix.trim()) {
    data.toolPrefix = await uniquePrefix(agentId, slugPrefix(input.toolPrefix), serverId);
  }

  // Bearer token is write-only and only touched on explicit input: an explicit switch away from
  // bearer clears it, an explicit null clears it, a string replaces it, anything else leaves it. A
  // partial update (e.g. saving only the allowlist) must never disturb the stored token.
  if (input.authKind !== undefined && input.authKind !== "bearer") data.bearerToken = null;
  else if (input.bearerToken === null) data.bearerToken = null;
  else if (typeof input.bearerToken === "string")
    data.bearerToken = new Uint8Array(encryptSecret(input.bearerToken));

  // Changing the URL or auth kind invalidates any cached OAuth identity for this server.
  const urlChanged = input.url !== undefined && input.url.trim() !== existing.url;
  const authChanged = input.authKind !== undefined && input.authKind !== existing.authKind;
  if (urlChanged || authChanged) {
    data.oauthClientInfo = null;
    data.oauthDiscovery = Prisma.DbNull;
    await prisma.mcpOAuthToken.deleteMany({ where: { mcpServerId: serverId } });
    await prisma.mcpOAuthFlow.deleteMany({ where: { mcpServerId: serverId } });
  }

  const row = await mcpServerRepository.update(serverId, data);
  return toSummary(row, await mcpServerRepository.oauthConnected(serverId, userId));
}

export async function deleteMcpServer(agentId: string, serverId: string): Promise<void> {
  await findOwned(agentId, serverId);
  await mcpServerRepository.delete(serverId);
}

export async function probeMcpServer(
  agentId: string,
  serverId: string,
  userId: string | null,
): Promise<McpProbeResult> {
  const row = await findOwned(agentId, serverId);
  return probeMcp(toMcpServerConfig(row), userId, {
    redirectUrl: oauthRedirectUrl(),
    redirectTo: landingUrl(agentId),
  });
}

export async function completeOAuth(
  userId: string,
  code: string,
  state: string,
): Promise<{ ok: true; redirectTo: string } | { ok: false; error: string }> {
  return completeMcpOAuth({ userId, code, state, redirectUrl: oauthRedirectUrl() });
}
