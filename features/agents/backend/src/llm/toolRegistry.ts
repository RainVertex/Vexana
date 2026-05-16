import type OpenAI from "openai";
import { prisma, Prisma, type CatalogEntity } from "@internal/db";
import {
  discoverAndPersist,
  parseGithubUrl,
  type DiscoverAndPersistResult,
} from "@feature/scaffolder-backend";

// Tool registry for agents.
//
// Each entry pairs an OpenAI-shaped tool definition with the handler that
// runs when the model emits a tool call. The agentic loop in runAgent reads
// agent.toolIds and resolves them through this registry.
//
// Phase 1 scope: catalog tools only (lookup / discover / propose-drift),
// moved verbatim from the previous hardcoded enricher executor. Scaffolder
// tool integration arrives in Phase 2 once we have a UI for picking tools
// and a story for propagating the calling Actor through the run loop. The
// shape of this registry is already actor-aware (see ToolContext) so adding
// scaffolder tools later is purely additive.

export interface ToolContext {
  // null for system / cron runs; required for actor-bound tools.
  userId: string | null;
  isAdmin: boolean;
  teamIds: string[];
  signal?: AbortSignal;
}

export interface RegisteredTool {
  id: string;
  openaiDef: OpenAI.Chat.Completions.ChatCompletionFunctionTool;
  handler: (args: unknown, ctx: ToolContext) => Promise<unknown>;
}

const CATALOG_TOOLS: RegisteredTool[] = [
  {
    id: "catalog_lookup",
    openaiDef: {
      type: "function",
      function: {
        name: "catalog_lookup",
        description: "Fetch the current CatalogEntity row from the database.",
        parameters: {
          type: "object",
          properties: {
            entityId: { type: "string", description: "CatalogEntity.id" },
          },
          required: ["entityId"],
        },
      },
    },
    handler: async (args): Promise<Partial<CatalogEntity> | null> => {
      const { entityId } = args as { entityId: string };
      if (typeof entityId !== "string" || !entityId) {
        throw new Error("entityId required");
      }
      return prisma.catalogEntity.findUnique({
        where: { id: entityId },
        include: {
          owners: {
            include: { team: { select: { id: true, slug: true, name: true } } },
          },
        },
      });
    },
  },
  {
    id: "catalog_discover",
    openaiDef: {
      type: "function",
      function: {
        name: "catalog_discover",
        description:
          "Fetch and parse catalog-info.yaml from a GitHub repo. Walks for catalog-info.yaml / .yml at the repo root. Returns the parsed entity payload and any parse errors.",
        parameters: {
          type: "object",
          properties: {
            repoUrl: {
              type: "string",
              description: "Full https://github.com/org/repo URL (the repo to inspect).",
            },
          },
          required: ["repoUrl"],
        },
      },
    },
    handler: async (args): Promise<DiscoverAndPersistResult> => {
      const { repoUrl } = args as { repoUrl: string };
      if (typeof repoUrl !== "string" || !repoUrl) {
        throw new Error("repoUrl required");
      }
      const parsed = parseGithubUrl(repoUrl);
      if (!parsed) throw new Error(`repoUrl is not a github URL: ${repoUrl}`);
      return discoverAndPersist({
        source: "github",
        target: `${parsed.owner}/${parsed.repo}`,
        token: process.env.GITHUB_TOKEN,
      });
    },
  },
  {
    id: "catalog_propose_drift",
    openaiDef: {
      type: "function",
      function: {
        name: "catalog_propose_drift",
        description:
          "Record a proposed change to a CatalogEntity for human review. Writes a CatalogDrift row with status=open. The diff should describe what fields differ and what the new values would be.",
        parameters: {
          type: "object",
          properties: {
            entityId: { type: "string" },
            kind: {
              type: "string",
              enum: ["field-mismatch", "missing-yaml", "yaml-only", "owner-stale"],
            },
            diff: {
              type: "object",
              description:
                "{fields: string[], before: object, after: object, reason?: string}. before is the current DB row (subset); after is the proposed values.",
            },
          },
          required: ["entityId", "kind", "diff"],
        },
      },
    },
    handler: async (args): Promise<{ driftId: string }> => {
      const { entityId, kind, diff } = args as {
        entityId: string;
        kind: string;
        diff: Record<string, unknown>;
      };
      if (typeof entityId !== "string" || !entityId) throw new Error("entityId required");
      if (typeof kind !== "string" || !kind) throw new Error("kind required");
      if (!diff || typeof diff !== "object") throw new Error("diff required");
      const created = await prisma.catalogDrift.create({
        data: {
          entityId,
          kind,
          diff: diff as Prisma.InputJsonValue,
          proposedBy: "agent",
        },
        select: { id: true },
      });
      return { driftId: created.id };
    },
  },
];

const REGISTRY: Map<string, RegisteredTool> = new Map(CATALOG_TOOLS.map((t) => [t.id, t]));

/** Add tools to the global registry at startup. */
export function registerTools(tools: RegisteredTool[]): void {
  for (const t of tools) REGISTRY.set(t.id, t);
}

/** Internal — for tests that want a clean slate. */
export function _resetExtraTools(): void {
  REGISTRY.clear();
  for (const t of CATALOG_TOOLS) REGISTRY.set(t.id, t);
}

export interface ToolDescriptor {
  id: string;
  name: string;
  description: string;
}

// Lightweight metadata for the UI tool-multiselect. Filtered by what the
// caller is allowed to see (Phase 1: all tools are visible to authenticated
// users; finer ACL arrives with scaffolder integration in Phase 2).
export function listAvailableTools(_ctx: ToolContext): ToolDescriptor[] {
  return CATALOG_TOOLS.map((t) => ({
    id: t.id,
    name: t.openaiDef.function.name,
    description: t.openaiDef.function.description ?? "",
  }));
}

// Resolve an Agent's declared toolIds to concrete defs + handlers. Order is
// preserved so the model sees a stable tool list across runs of the same
// agent.
export function resolveTools(toolIds: string[]): RegisteredTool[] {
  return toolIds.map((id) => {
    const t = REGISTRY.get(id);
    if (!t) throw new Error(`Unknown tool: ${id}`);
    return t;
  });
}
