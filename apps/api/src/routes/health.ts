import type { Express, Request, Response } from "express";
import { prisma } from "@internal/db";

export function registerHealthRoute(app: Express) {
  app.get("/health", async (_req: Request, res: Response) => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const stuck = await prisma.jobRun
      .count({
        where: { status: "running", startedAt: { lt: fiveMinAgo } },
      })
      .catch(() => 0);
    const status = stuck > 0 ? "degraded" : "ok";
    res.status(stuck > 0 ? 503 : 200).json({ status, jobs: { stuck } });
  });
}
