import { Router } from "express";
import { prisma } from "@internal/db";

export const doraMetricsRouter: Router = Router();

doraMetricsRouter.get("/", async (_req, res) => {
  const snapshots = await prisma.doraMetricsSnapshot.findMany({
    orderBy: { periodEnd: "desc" },
    take: 100,
  });
  res.json({ items: snapshots });
});

doraMetricsRouter.get("/entity/:entityId", async (req, res) => {
  const snapshots = await prisma.doraMetricsSnapshot.findMany({
    where: { entityId: req.params.entityId },
    orderBy: { periodEnd: "desc" },
  });
  res.json({ items: snapshots });
});

import type { FeatureManifest } from "@internal/feature-host";

export const featureManifest: FeatureManifest = {
  mounts: [{ path: "/api/dora-metrics", router: doraMetricsRouter }],
};
