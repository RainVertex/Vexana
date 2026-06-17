import { Router } from "express";
import type { SearchHit, SearchResults } from "@feature/search-shared";
import { rankHits } from "./ranking";
import type { SearchSource, SourceContext } from "./sources/types";
import { catalog } from "./sources/catalog";
import { teams } from "./sources/teams";
import { agents } from "./sources/agents";
import { devdocs } from "./sources/devdocs";
import { projects } from "./sources/projects";
import { tasks } from "./sources/tasks";
import { chat } from "./sources/chat";
import { pages } from "./sources/pages";

export const searchRouter: Router = Router();

const SOURCES: SearchSource[] = [catalog, teams, agents, devdocs, projects, tasks, chat, pages];

const PER_SOURCE_LIMIT = 10;

searchRouter.get("/", async (req, res) => {
  const query = String(req.query.q ?? "").trim();
  if (!query) return res.json({ query, hits: [] } satisfies SearchResults);

  const ctx: SourceContext = {
    userId: req.user!.id,
    isAdmin: req.user!.role === "admin",
  };

  // Each source isolates its own failure so one bad provider never sinks the whole search.
  const perSource = await Promise.all(
    SOURCES.map((source) => source(query, ctx, PER_SOURCE_LIMIT).catch(() => [] as SearchHit[])),
  );

  const hits = rankHits(query, perSource.flat());
  res.json({ query, hits } satisfies SearchResults);
});

import type { FeatureManifest } from "@internal/feature-host";

export const featureManifest: FeatureManifest = {
  mounts: [{ path: "/api/search", router: searchRouter }],
};
