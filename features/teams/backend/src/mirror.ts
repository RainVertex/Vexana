import { octokitForInstallation } from "@feature/integrations-backend";

// GitHub mirror
//
// Approve flow uses createGithubTeam BEFORE writing any platform-side rows.
// On failure the approval returns a 502 and no DB writes happen. If the
// platform-side transaction throws AFTER GH succeeded (extremely rare), the
// approve handler calls bestEffortDeleteGithubTeam to clean up the orphan.

export class GithubMirrorError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "GithubMirrorError";
  }
}

export interface CreateGithubTeamInput {
  installationId: number;
  orgLogin: string;
  /** Platform slug, passed as `name` to GitHub since GitHub re-derives the slug from the name. */
  name: string;
  description: string | null;
}

export interface CreateGithubTeamResult {
  /** GitHub team node_id, stable across renames. what we stamp on Team.externalId. */
  nodeId: string;
  /** GitHub-assigned slug (may differ from input name's slugification). */
  githubSlug: string;
}

export async function createGithubTeam(
  input: CreateGithubTeamInput,
): Promise<CreateGithubTeamResult> {
  const octo = await octokitForInstallation(input.installationId);
  try {
    const res = await octo.rest.teams.create({
      org: input.orgLogin,
      name: input.name,
      description: input.description ?? undefined,
      privacy: "closed",
    });
    const data = res.data as { node_id?: string; slug?: string };
    if (!data.node_id || !data.slug) {
      throw new GithubMirrorError(
        502,
        "GitHub team-create returned an unexpected response (missing node_id or slug)",
      );
    }
    return { nodeId: data.node_id, githubSlug: data.slug };
  } catch (err) {
    if (err instanceof GithubMirrorError) throw err;
    // Octokit RequestError shape: { status, message, response?.data?.message }.
    const e = err as { status?: number; message?: string };
    const status = typeof e.status === "number" ? e.status : 502;
    const message = e.message ?? "Unknown GitHub error";
    throw new GithubMirrorError(status, message);
  }
}

export interface AddGithubTeamMemberInput {
  installationId: number;
  orgLogin: string;
  githubSlug: string;
  /** GitHub login of the user to add. */
  githubLogin: string;
  role: "maintainer" | "member";
}

export interface AddGithubTeamMemberResult {
  state: "active" | "pending";
}

/** Add a user to a GH team with the given role. */
export async function addGithubTeamMember(
  input: AddGithubTeamMemberInput,
): Promise<AddGithubTeamMemberResult> {
  const octo = await octokitForInstallation(input.installationId);
  try {
    const res = await octo.rest.teams.addOrUpdateMembershipForUserInOrg({
      org: input.orgLogin,
      team_slug: input.githubSlug,
      username: input.githubLogin,
      role: input.role,
    });
    const data = res.data as { state?: string };
    const state = data.state === "pending" ? "pending" : "active";
    return { state };
  } catch (err) {
    const e = err as { status?: number; message?: string };
    const status = typeof e.status === "number" ? e.status : 502;
    const message = e.message ?? "Unknown GitHub error";
    throw new GithubMirrorError(status, message);
  }
}

/** Adds the requester to the just-created GH team as maintainer. */
export async function addGithubTeamMaintainer(
  input: Omit<AddGithubTeamMemberInput, "role">,
): Promise<AddGithubTeamMemberResult> {
  return addGithubTeamMember({ ...input, role: "maintainer" });
}

/** Used only on the rare orphan-recovery path when the platform-side tx fails after GitHub */
export async function bestEffortDeleteGithubTeam(
  installationId: number,
  orgLogin: string,
  githubSlug: string,
): Promise<void> {
  try {
    const octo = await octokitForInstallation(installationId);
    await octo.rest.teams.deleteInOrg({ org: orgLogin, team_slug: githubSlug });
  } catch {
    // Intentional: orphan cleanup is best-effort.
  }
}
