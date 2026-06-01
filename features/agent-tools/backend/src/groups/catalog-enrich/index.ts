import { prisma, type CatalogEntity } from "@internal/db";
import {
  discoverAndPersist,
  parseGithubUrl,
  type DiscoverAndPersistResult,
} from "@feature/scaffolder-backend";
import { parseCatalogInfo } from "@feature/catalog-backend";
import { octokitForInstallation, openOrUpdateFilePr } from "@feature/integrations-backend";
import type { RegisteredTool } from "@internal/llm-core";
import type { ToolGroup } from "../../types";

// Resolves an entity to its GitHub repo coordinates and installation, or a structured error the model/worker can act on.
type EntityRepo = { owner: string; repo: string; installationId: number };
async function loadEntityRepo(
  entityId: unknown,
): Promise<EntityRepo | { error: string; code: string }> {
  if (typeof entityId !== "string" || !entityId)
    return { error: "entityId required", code: "bad_args" };
  const entity = await prisma.catalogEntity.findUnique({
    where: { id: entityId },
    select: { repoUrl: true, installationId: true },
  });
  if (!entity) return { error: `Entity not found: ${entityId}`, code: "not_found" };
  if (!entity.repoUrl) return { error: "Entity has no repoUrl", code: "no_repo" };
  const gh = parseGithubUrl(entity.repoUrl);
  if (!gh) return { error: `repoUrl is not a github URL: ${entity.repoUrl}`, code: "not_github" };
  if (entity.installationId == null) {
    return {
      error: "Entity has no GitHub App installation; cannot read or write the repo",
      code: "no_installation",
    };
  }
  return { owner: gh.owner, repo: gh.repo, installationId: entity.installationId };
}

// Catalog enrichment tools for the Catalog Enricher agent (lookup, discover, repo reads, open catalog-info.yaml PR).

const lookup: RegisteredTool = {
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
};

const discover: RegisteredTool = {
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
};

const readRepo: RegisteredTool = {
  id: "catalog_read_repo",
  openaiDef: {
    type: "function",
    function: {
      name: "catalog_read_repo",
      description:
        "Inspect the entity's GitHub repository to infer catalog metadata: returns the repo description, topics, primary language, default branch, archived flag, and the root file listing. Call this to decide what catalog-info.yaml should contain.",
      parameters: {
        type: "object",
        properties: { entityId: { type: "string", description: "CatalogEntity.id" } },
        required: ["entityId"],
      },
    },
  },
  handler: async (args) => {
    const repo = await loadEntityRepo((args as { entityId?: unknown }).entityId);
    if ("error" in repo) return repo;
    const octo = await octokitForInstallation(repo.installationId);
    const meta = await octo.rest.repos.get({ owner: repo.owner, repo: repo.repo });
    let rootFiles: string[] = [];
    try {
      const root = await octo.rest.repos.getContent({
        owner: repo.owner,
        repo: repo.repo,
        path: "",
      });
      if (Array.isArray(root.data)) {
        rootFiles = root.data.map((f) => (f as { name: string }).name);
      }
    } catch {
      // Root listing is best-effort; an empty repo or permission gap just yields no files.
    }
    return {
      name: meta.data.name,
      description: meta.data.description,
      topics: (meta.data as { topics?: string[] }).topics ?? [],
      primaryLanguage: meta.data.language ?? null,
      defaultBranch: meta.data.default_branch,
      archived: meta.data.archived,
      rootFiles,
    };
  },
};

const readFile: RegisteredTool = {
  id: "catalog_read_file",
  openaiDef: {
    type: "function",
    function: {
      name: "catalog_read_file",
      description:
        "Read a single text file from the entity's repo (e.g. README.md, package.json, pyproject.toml, go.mod, CODEOWNERS, catalog-info.yaml). Returns the file content (truncated if large) or { missing: true } if absent.",
      parameters: {
        type: "object",
        properties: {
          entityId: { type: "string", description: "CatalogEntity.id" },
          path: { type: "string", description: "Repo-relative file path, e.g. README.md" },
        },
        required: ["entityId", "path"],
      },
    },
  },
  handler: async (args) => {
    const { entityId, path } = args as { entityId?: unknown; path?: unknown };
    if (typeof path !== "string" || !path) return { error: "path required", code: "bad_args" };
    const repo = await loadEntityRepo(entityId);
    if ("error" in repo) return repo;
    const octo = await octokitForInstallation(repo.installationId);
    try {
      const res = await octo.rest.repos.getContent({ owner: repo.owner, repo: repo.repo, path });
      if (Array.isArray(res.data)) return { error: "path is a directory", code: "is_dir" };
      const data = res.data as { type?: string; encoding?: string; content?: string };
      if (data.type !== "file" || data.encoding !== "base64" || !data.content) {
        return { error: "not a readable text file", code: "unreadable" };
      }
      let content = Buffer.from(data.content, "base64").toString("utf8");
      const MAX = 60_000;
      const truncated = content.length > MAX;
      if (truncated) content = content.slice(0, MAX);
      return { path, content, truncated };
    } catch (err) {
      if ((err as { status?: number }).status === 404) return { path, missing: true };
      return { error: (err as Error).message, code: "read_failed" };
    }
  },
};

const openYamlPr: RegisteredTool = {
  id: "catalog_open_yaml_pr",
  openaiDef: {
    type: "function",
    function: {
      name: "catalog_open_yaml_pr",
      description:
        "Open (or update) a pull request that writes catalog-info.yaml to the entity's repo. The yaml is validated first; pass the COMPLETE file content. Re-runs update the same branch/PR. Returns { prUrl, prNumber, branchName, action }.",
      parameters: {
        type: "object",
        properties: {
          entityId: { type: "string", description: "CatalogEntity.id" },
          yaml: {
            type: "string",
            description:
              "Full catalog-info.yaml content (flat schema: kind, name, description, ownerTeamIds, repoUrl, tags).",
          },
        },
        required: ["entityId", "yaml"],
      },
    },
  },
  handler: async (args) => {
    const { entityId, yaml } = args as { entityId?: unknown; yaml?: unknown };
    if (typeof yaml !== "string" || !yaml.trim())
      return { error: "yaml required", code: "bad_args" };
    const validated = parseCatalogInfo("catalog-info.yaml", yaml);
    if (validated.kind === "error") {
      return { error: `Invalid catalog-info.yaml: ${validated.reason}`, code: "invalid_yaml" };
    }
    const repo = await loadEntityRepo(entityId);
    if ("error" in repo) return repo;
    try {
      return await openOrUpdateFilePr({
        installationId: repo.installationId,
        owner: repo.owner,
        repo: repo.repo,
        filePath: "catalog-info.yaml",
        content: yaml.endsWith("\n") ? yaml : `${yaml}\n`,
        branchName: "catalog-info/enricher",
        title: "chore(catalog): add or update catalog-info.yaml",
        body: "Automated by the Catalog Enricher: fills catalog metadata for the developer portal. Review and merge to update the catalog.",
      });
    } catch (err) {
      return { error: (err as Error).message, code: "pr_failed" };
    }
  },
};

export const catalogEnrichGroup: ToolGroup = {
  meta: {
    id: "catalog-enrich",
    label: "Katalog zenginleştirme",
    description: "Repoyu inceleyip catalog-info.yaml'ı doldurmak için PR açma.",
    order: 90,
  },
  tools: [lookup, discover, readRepo, readFile, openYamlPr],
};
