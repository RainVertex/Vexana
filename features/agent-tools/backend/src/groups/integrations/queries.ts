import { prisma } from "@internal/db";

export async function listGithubInstallations() {
  const rows = await prisma.integration.findMany({
    where: { kind: "github", enabled: true },
    select: { id: true, name: true, config: true },
    orderBy: { name: "asc" },
  });
  return rows
    .map((row) => {
      const cfg = row.config;
      const accountLogin =
        cfg && typeof cfg === "object" && !Array.isArray(cfg)
          ? ((cfg as Record<string, unknown>).accountLogin as unknown)
          : null;
      return {
        integrationId: row.id,
        name: row.name,
        accountLogin: typeof accountLogin === "string" ? accountLogin : "",
      };
    })
    .filter((i) => i.accountLogin.length > 0);
}
