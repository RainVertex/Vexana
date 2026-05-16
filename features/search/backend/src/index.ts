import { Router } from "express";
import { prisma } from "@internal/db";
import { getDevDocsSearchHits } from "@feature/catalog-backend";
import type { SearchHit, SearchResults } from "@internal/shared-types";

export const searchRouter: Router = Router();

searchRouter.get("/", async (req, res) => {
  const query = String(req.query.q ?? "").trim();
  if (!query) return res.json({ query, hits: [] } satisfies SearchResults);

  const [entities, projects, teams, agents, devdocs] = await Promise.all([
    prisma.catalogEntity.findMany({
      where: { name: { contains: query, mode: "insensitive" } },
      take: 10,
    }),
    // The "project" kind in SearchHit now refers to Plane projects mirrored
    // into the workspace module. Native Project rows were dropped when the
    // workspace became a Plane integration.
    prisma.planeProject.findMany({
      where: {
        archivedAt: null,
        name: { contains: query, mode: "insensitive" },
      },
      take: 10,
    }),
    prisma.team.findMany({
      where: { name: { contains: query, mode: "insensitive" } },
      take: 10,
    }),
    prisma.agent.findMany({
      where: { name: { contains: query, mode: "insensitive" } },
      take: 10,
    }),
    getDevDocsSearchHits(query, 10).catch(() => [] as SearchHit[]),
  ]);

  const hits: SearchHit[] = [
    ...entities.map((e) => ({
      id: e.id,
      kind: "catalog" as const,
      title: e.name,
      snippet: e.description ?? undefined,
    })),
    ...projects.map((p) => ({
      id: p.id,
      kind: "project" as const,
      title: p.name,
      snippet: p.description ?? undefined,
      href: `/workspace/projects/${p.id}`,
    })),
    ...teams.map((t) => ({
      id: t.id,
      kind: "team" as const,
      title: t.name,
      snippet: t.description ?? undefined,
    })),
    ...agents.map((a) => ({
      id: a.id,
      kind: "agent" as const,
      title: a.name,
      snippet: a.description ?? undefined,
    })),
    ...devdocs,
  ];

  res.json({ query, hits } satisfies SearchResults);
});
