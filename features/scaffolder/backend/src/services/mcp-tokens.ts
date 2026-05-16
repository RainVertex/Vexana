import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@internal/db";

// Token format: `mcp_<id>_<48 base64url chars>`. The id prefix lets us
// identify the row to verify against without scanning. Only the sha256 of
// the full token is persisted; the cleartext is shown to the admin once
// at mint time and never again.

const TOKEN_PREFIX = "mcp_";

export interface MintedToken {
  id: string;
  // Cleartext, returned once at mint time.
  token: string;
  expiresAt: Date;
}

export interface VerifiedTokenContext {
  tokenId: string;
  userId: string;
  scopes: string[];
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateRandom(): string {
  return randomBytes(36).toString("base64url");
}

export async function mintMcpToken(input: {
  userId: string;
  name: string;
  scopes: string[];
  ttlSeconds: number;
}): Promise<MintedToken> {
  const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000);
  const random = generateRandom();
  const row = await prisma.scaffolderMcpToken.create({
    data: {
      userId: input.userId,
      name: input.name,
      scopes: input.scopes,
      // We need the row id before we know the cleartext token; insert with a
      // placeholder hash, then update once we know the id.
      tokenHash: "pending",
      expiresAt,
    },
    select: { id: true },
  });
  const cleartext = `${TOKEN_PREFIX}${row.id}_${random}`;
  await prisma.scaffolderMcpToken.update({
    where: { id: row.id },
    data: { tokenHash: hashToken(cleartext) },
  });
  return { id: row.id, token: cleartext, expiresAt };
}

export async function verifyMcpToken(token: string): Promise<VerifiedTokenContext | null> {
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  const rest = token.slice(TOKEN_PREFIX.length);
  const sep = rest.indexOf("_");
  if (sep < 1) return null;
  const tokenId = rest.slice(0, sep);
  const row = await prisma.scaffolderMcpToken.findUnique({
    where: { id: tokenId },
    select: {
      id: true,
      userId: true,
      scopes: true,
      tokenHash: true,
      expiresAt: true,
    },
  });
  if (!row) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;
  if (row.tokenHash !== hashToken(token)) return null;
  // Best-effort touch — don't await; failure shouldn't block auth.
  void prisma.scaffolderMcpToken
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});
  return { tokenId: row.id, userId: row.userId, scopes: row.scopes };
}

export async function listMcpTokensForUser(userId: string) {
  return prisma.scaffolderMcpToken.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });
}

export async function listAllMcpTokens() {
  return prisma.scaffolderMcpToken.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userId: true,
      name: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });
}

export async function revokeMcpToken(id: string): Promise<boolean> {
  try {
    await prisma.scaffolderMcpToken.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}
