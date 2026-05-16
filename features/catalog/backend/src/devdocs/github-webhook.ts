import express, { Router, type Request, type Response } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@internal/db";
import { syncDevDocsForEntity } from "./sync";

interface WebhookRepository {
  html_url?: string;
  clone_url?: string;
  ssh_url?: string;
  full_name?: string;
}

interface PushPayload {
  repository?: WebhookRepository;
  ref?: string;
}

function verifySignature(secret: string, body: Buffer, headerSig: string | undefined): boolean {
  if (!headerSig || !headerSig.startsWith("sha256=")) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(headerSig);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** GitHub presents the same repo through several URL shapes (html, clone, ssh, with/without */
function candidateUrls(repo: WebhookRepository | undefined): string[] {
  if (!repo) return [];
  const out = new Set<string>();
  const push = (u: string | undefined) => {
    if (!u) return;
    out.add(u);
    out.add(u.replace(/\.git$/, ""));
    out.add(u.replace(/\/$/, ""));
  };
  push(repo.html_url);
  push(repo.clone_url);
  push(repo.ssh_url);
  if (repo.full_name) {
    push(`https://github.com/${repo.full_name}`);
    push(`https://github.com/${repo.full_name}.git`);
    push(`git@github.com:${repo.full_name}.git`);
  }
  return Array.from(out);
}

export const githubWebhookRouter: Router = Router();

// express.raw is scoped to this route so the global express.json() in
// createServer doesn't consume the body before we can verify the signature.
githubWebhookRouter.post(
  "/",
  express.raw({ type: "*/*", limit: "5mb" }),
  async (req: Request, res: Response) => {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
      return res.status(503).json({ error: "GITHUB_WEBHOOK_SECRET not configured" });
    }

    const raw = req.body;
    if (!Buffer.isBuffer(raw)) {
      return res.status(400).json({ error: "raw body required" });
    }

    const sig = req.header("x-hub-signature-256");
    if (!verifySignature(secret, raw, sig)) {
      return res.status(401).json({ error: "invalid signature" });
    }

    const event = req.header("x-github-event") ?? "";
    if (event === "ping") {
      return res.json({ ok: true, pong: true });
    }
    if (event !== "push") {
      // Acknowledge but don't act on non-push events.
      return res.status(202).json({ skipped: event || "unknown" });
    }

    let payload: PushPayload;
    try {
      payload = JSON.parse(raw.toString("utf8")) as PushPayload;
    } catch {
      return res.status(400).json({ error: "invalid json body" });
    }

    const urls = candidateUrls(payload.repository);
    if (urls.length === 0) {
      return res.status(202).json({ skipped: "no repository url in payload" });
    }

    const entities = await prisma.catalogEntity.findMany({
      where: { repoUrl: { in: urls }, staleSince: null },
      select: { id: true },
    });

    for (const e of entities) {
      // Fire-and-forget: respond fast so GitHub doesn't time the delivery out.
      // Errors are swallowed because syncDevDocsForEntity already records them
      // on DocSyncState.lastError for the UI to surface.
      void syncDevDocsForEntity(e.id).catch(() => {});
    }

    res.status(202).json({ matched: entities.length });
  },
);
