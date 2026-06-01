// Open (or update) a pull request that writes a file, using the installation's GitHub App token. Idempotent on a stable branch: re-runs update the same branch/PR instead of duplicating.
import { octokitForInstallation } from "./octokit";

export interface OpenFilePrInput {
  installationId: number;
  owner: string;
  repo: string;
  filePath: string;
  content: string;
  branchName: string;
  title: string;
  body: string;
}

export interface OpenFilePrResult {
  prUrl: string;
  prNumber: number;
  branchName: string;
  action: "created" | "updated";
}

function statusOf(err: unknown): number | undefined {
  return (err as { status?: number } | null)?.status;
}

export async function openOrUpdateFilePr(input: OpenFilePrInput): Promise<OpenFilePrResult> {
  const { owner, repo, branchName, filePath } = input;
  const octo = await octokitForInstallation(input.installationId);

  const repoMeta = await octo.rest.repos.get({ owner, repo });
  if (repoMeta.data.archived) throw new Error(`Repo ${owner}/${repo} is archived`);
  const baseBranch = repoMeta.data.default_branch;

  const baseRef = await octo.rest.git.getRef({ owner, repo, ref: `heads/${baseBranch}` });
  const baseSha = baseRef.data.object.sha;

  // Ensure the working branch exists, pointing at the current base tip.
  try {
    await octo.rest.git.getRef({ owner, repo, ref: `heads/${branchName}` });
  } catch (err) {
    if (statusOf(err) !== 404) throw err;
    await octo.rest.git.createRef({ owner, repo, ref: `refs/heads/${branchName}`, sha: baseSha });
  }

  // The current blob sha on the branch is required to update an existing file.
  let existingSha: string | undefined;
  try {
    const existing = await octo.rest.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: branchName,
    });
    const data = existing.data as { sha?: string; type?: string };
    if (data.type === "file" && typeof data.sha === "string") existingSha = data.sha;
  } catch (err) {
    if (statusOf(err) !== 404) throw err;
  }

  // Commit the file. A no-op (identical content) can 422; tolerate it so re-runs stay idempotent.
  try {
    await octo.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      branch: branchName,
      message: input.title,
      content: Buffer.from(input.content, "utf8").toString("base64"),
      sha: existingSha,
    });
  } catch (err) {
    if (statusOf(err) !== 422) throw err;
  }

  // Reuse an open PR from this branch if one exists; otherwise open a new one.
  const open = await octo.rest.pulls.list({
    owner,
    repo,
    head: `${owner}:${branchName}`,
    state: "open",
  });
  const existingPr = open.data[0];
  if (existingPr) {
    return {
      prUrl: existingPr.html_url,
      prNumber: existingPr.number,
      branchName,
      action: "updated",
    };
  }

  const created = await octo.rest.pulls.create({
    owner,
    repo,
    head: branchName,
    base: baseBranch,
    title: input.title,
    body: input.body,
  });
  return {
    prUrl: created.data.html_url,
    prNumber: created.data.number,
    branchName,
    action: "created",
  };
}
