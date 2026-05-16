import { Router } from "express";
import { prisma } from "@internal/db";

export const observabilityRouter: Router = Router();

observabilityRouter.get("/health-samples", async (_req, res) => {
  const samples = await prisma.serviceHealthSample.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({ items: samples });
});

observabilityRouter.get("/health-samples/:entityId", async (req, res) => {
  const samples = await prisma.serviceHealthSample.findMany({
    where: { entityId: req.params.entityId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({ items: samples });
});
