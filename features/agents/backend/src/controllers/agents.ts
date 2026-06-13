import type { Request, Response } from "express";
import type { User } from "@internal/db";
import type { CreateAgentInput, RunAgentBody, TestAgentInput, UpdateAgentInput } from "../dto";
import * as agentsService from "../services/agents";
import type { CallerContext } from "../services/agents";

type IdParams = { id: string };
type RunParams = { id: string; runId: string };

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
