import { z } from "zod";
import { prisma } from "@internal/db";
import { octokitForLogin } from "@feature/integrations-backend/contract";
import type { Action, ReadCtx, WriteCtx } from "@internal/scaffolder-core";

// github:grant-team-access action: grants the chosen owner teams repository access on GitHub so the
// owning team actually holds the repo and the projects sync (CatalogEntityTeamGrant) can surface it.

const grantTeamAccessInput = z.object({
  org: z.string().min(1).describe("GitHub organization that owns the repo"),
  repo: z.string().min(1).describe("Repository name to grant access on"),
  teamIds: z
    .array(z.string().min(1))
    .default([])
    .describe("Platform team ids (owners) to grant repository access"),
  permission: z
    .enum(["pull", "triage", "push", "maintain", "admin"])
    .default("maintain")
    .describe("GitHub repository permission granted to each owner team"),
});

type GrantTeamAccessInput = z.infer<typeof grantTeamAccessInput>;

interface GrantTeamAccessOutput {
  granted: string[];
}

type TeamRow = {
  id: string;
  name: string;
  source: string;
  externalSlug: string | null;
  accountLogin: string;
};

// Only GitHub-backed teams in the entity's org can be granted. Manual or cross-org teams have no
// GitHub counterpart to grant against.
type GithubTeam = TeamRow & { externalSlug: string };

function isGrantable(team: TeamRow, org: string): team is GithubTeam {
  return team.source === "github" && team.externalSlug !== null && team.accountLogin === org;
}

async function resolveTeams(teamIds: string[]): Promise<TeamRow[]> {
  if (teamIds.length === 0) return [];
  return prisma.team.findMany({
    where: { id: { in: teamIds }, deletedAt: null },
    select: { id: true, name: true, source: true, externalSlug: true, accountLogin: true },
  });
}

export const grantTeamAccessAction: Action<GrantTeamAccessInput, GrantTeamAccessOutput> = {
  id: "github:grant-team-access",
  description:
    "Grant the chosen owner teams repository access on GitHub so ownership translates into real repo access and project membership.",
  schema: grantTeamAccessInput,
  capabilities: ["network:external"],
  async match(_input, _ctx: ReadCtx) {
    // Grants are idempotent (addOrUpdate), so the apply step always converges.
    return "absent";
  },
  async diff(input) {
    const teams = await resolveTeams(input.teamIds);
    const slugs = teams
      .filter((t): t is GithubTeam => isGrantable(t, input.org))
      .map((t) => t.externalSlug);
    if (slugs.length === 0) return [];
    return [
      {
        kind: "github.grantTeam",
        repo: `${input.org}/${input.repo}`,
        teamSlugs: slugs,
        permission: input.permission,
      },
    ];
  },
  async apply(input, ctx: WriteCtx) {
    const noop = (reason: string) => ({
      output: { granted: [] as string[] },
      compensation: { kind: "noop" as const, reason },
    });

    if (input.teamIds.length === 0) {
      ctx.logger.info("github:grant-team-access: no owner teams selected, nothing to grant");
      return noop("no owner teams selected");
    }
    if (ctx.dryRun) {
      ctx.logger.info(
        `[dry-run] github:grant-team-access would grant ${input.teamIds.length} team(s) ${input.permission} on ${input.org}/${input.repo}`,
      );
      return noop("dry run");
    }

    const teams = await resolveTeams(input.teamIds);
    const grantable = teams.filter((t): t is GithubTeam => isGrantable(t, input.org));
    for (const t of teams) {
      if (!isGrantable(t, input.org)) {
        ctx.logger.warn(
          `github:grant-team-access: skipping "${t.name}" (not a GitHub team in ${input.org}); no repo access granted`,
        );
      }
    }
    if (grantable.length === 0) {
      ctx.logger.warn(
        `github:grant-team-access: no GitHub-backed owner teams in ${input.org}; no repo access granted`,
      );
      return noop("no GitHub-backed owner teams");
    }

    const octo = await octokitForLogin(input.org);
    if (!octo) {
      throw new Error(
        `github:grant-team-access: the GitHub App is not installed on "${input.org}". Install it (Administration write) before scaffolding.`,
      );
    }

    const granted: string[] = [];
    const failed: string[] = [];
    for (const team of grantable) {
      try {
        await octo.rest.teams.addOrUpdateRepoPermissionsInOrg({
          org: input.org,
          team_slug: team.externalSlug,
          owner: input.org,
          repo: input.repo,
          permission: input.permission,
        });
        granted.push(team.externalSlug);
        ctx.logger.info(
          `github:grant-team-access: granted ${team.externalSlug} ${input.permission} on ${input.org}/${input.repo}`,
        );
      } catch (err) {
        failed.push(team.externalSlug);
        ctx.logger.warn(
          `github:grant-team-access: failed to grant ${team.externalSlug}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // A total failure is systemic (usually the App lacks Administration write), so surface it loudly.
    if (granted.length === 0 && failed.length > 0) {
      throw new Error(
        `github:grant-team-access: could not grant repo access to any owner team on ${input.org}/${input.repo}. Ensure the GitHub App has Administration: write. Teams: ${failed.join(", ")}`,
      );
    }

    return {
      output: { granted },
      compensation: {
        kind: "noop",
        reason: `team grants left in place on rollback (repo ${input.org}/${input.repo} already exists)`,
      },
    };
  },
};

export { grantTeamAccessInput };
