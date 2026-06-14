import type { Request, Response } from "express";
import type { User } from "@internal/db";
import type {
  CreateAgentInput,
  CreateMcpServerInput,
  RunAgentBody,
  TestAgentInput,
  UpdateAgentInput,
  UpdateMcpServerInput,
} from "../dto";
import * as agentsService from "../services/agents";
import type { CallerContext } from "../services/agents";
import * as mcpService from "../services/mcpServers";

type IdParams = { id: string };
type RunParams = { id: string; runId: string };
type McpParams = { id: string; sid: string };

// req.user is guaranteed by requireAuth/requireAdmin on every route that calls this.
function caller(req: { user?: User }): CallerContext {
  const user = req.user!;
  return { id: user.id, isAdmin: user.role === "admin" };
}

export async function list(_req: Request, res: Response): Promise<void> {
  res.json({ items: await agentsService.listAgents() });
}

export function tools(req: Request, res: Response): void {
  const user = req.user!;
  res.json(
    agentsService.listTools({ userId: user.id, isAdmin: user.role === "admin", teamIds: [] }),
  );
}

export async function detail(req: Request<IdParams>, res: Response): Promise<void> {
  res.json(await agentsService.getAgentDetail(req.params.id, caller(req)));
}

export async function getRun(req: Request<RunParams>, res: Response): Promise<void> {
  res.json(await agentsService.getRun(req.params.id, req.params.runId, caller(req)));
}

export async function cancelRun(req: Request<RunParams>, res: Response): Promise<void> {
  res.json(await agentsService.cancelRun(req.params.id, req.params.runId, caller(req)));
}

export async function create(_req: Request, res: Response): Promise<void> {
  const input = res.locals.body as CreateAgentInput;
  res.status(201).json(await agentsService.createAgent(input));
}

export async function update(req: Request<IdParams>, res: Response): Promise<void> {
  const input = res.locals.body as UpdateAgentInput;
  res.json(await agentsService.updateAgent(req.params.id, input));
}

export async function remove(req: Request<IdParams>, res: Response): Promise<void> {
  await agentsService.deleteAgent(req.params.id);
  res.status(204).end();
}

export async function test(req: Request<IdParams>, res: Response): Promise<void> {
  const input = res.locals.body as TestAgentInput;
  res.json(await agentsService.testAgent(req.params.id, input.prompt, caller(req)));
}

export async function run(req: Request<IdParams>, res: Response): Promise<void> {
  const input = res.locals.body as RunAgentBody;
  res.status(202).json(await agentsService.runAgentManual(req.params.id, input.input, caller(req)));
}

export async function listMcpServers(req: Request<IdParams>, res: Response): Promise<void> {
  res.json({ items: await mcpService.listMcpServers(req.params.id, req.user!.id) });
}

export async function createMcpServer(req: Request<IdParams>, res: Response): Promise<void> {
  const input = res.locals.body as CreateMcpServerInput;
  res.status(201).json(await mcpService.createMcpServer(req.params.id, input));
}

export async function updateMcpServer(req: Request<McpParams>, res: Response): Promise<void> {
  const input = res.locals.body as UpdateMcpServerInput;
  res.json(await mcpService.updateMcpServer(req.params.id, req.params.sid, input, req.user!.id));
}

export async function deleteMcpServer(req: Request<McpParams>, res: Response): Promise<void> {
  await mcpService.deleteMcpServer(req.params.id, req.params.sid);
  res.status(204).end();
}

export async function probeMcpServer(req: Request<McpParams>, res: Response): Promise<void> {
  res.json(await mcpService.probeMcpServer(req.params.id, req.params.sid, req.user!.id));
}

// Browser redirect target for the MCP OAuth dance. Authenticated via session cookie; the flow row is
// keyed by state and bound to the user, so a mismatched user is rejected.
export async function mcpOAuthCallback(req: Request, res: Response): Promise<void> {
  const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3010";
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  if (!code || !state) {
    res.redirect(`${webOrigin}/?mcp_oauth=error`);
    return;
  }
  const result = await mcpService.completeOAuth(req.user!.id, code, state);
  if (result.ok) {
    res.redirect(result.redirectTo);
    return;
  }
  res.redirect(`${webOrigin}/?mcp_oauth=error`);
}
