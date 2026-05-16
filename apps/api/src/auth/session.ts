import { createHash, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { prisma } from "@internal/db";
import type { User } from "@internal/db";
import { loadEnv } from "../config/env";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function createSession(userId: string, req: Request): Promise<string> {
  const env = loadEnv();
  const raw = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + env.sessionMaxAgeMs);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: req.get("user-agent")?.slice(0, 512) ?? null,
      ip: req.ip ?? null,
    },
  });

  return raw;
}

export async function validateSession(raw: string | undefined): Promise<User | null> {
  if (!raw) return null;
  const tokenHash = hashToken(raw);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (session.user.status !== "active") return null;
  return session.user;
}

export async function revokeSession(raw: string | undefined): Promise<void> {
  if (!raw) return;
  const tokenHash = hashToken(raw);
  await prisma.session.delete({ where: { tokenHash } }).catch(() => undefined);
}

export function setSessionCookie(res: Response, rawToken: string): void {
  const env = loadEnv();
  res.cookie(env.sessionCookieName, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    path: "/",
    maxAge: env.sessionMaxAgeMs,
    signed: true,
  });
}

export function clearSessionCookie(res: Response): void {
  const env = loadEnv();
  res.clearCookie(env.sessionCookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    path: "/",
    signed: true,
  });
}

export function readSessionCookie(req: Request): string | undefined {
  const env = loadEnv();
  const signed = req.signedCookies?.[env.sessionCookieName];
  if (typeof signed === "string") return signed;
  return undefined;
}
