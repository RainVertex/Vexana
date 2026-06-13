import { Router } from "express";
import * as agents from "../controllers/agents";
import { agentsErrorHandler } from "../errors";
import { createAgentSchema, runAgentSchema, testAgentSchema, updateAgentSchema } from "../dto";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

export const agentsRouter: Router = Router();

agentsRouter.get("/", requireAuth, agents.list);
agentsRouter.get("/tools", requireAuth, agents.tools);
agentsRouter.get("/:id", requireAuth, agents.detail);
agentsRouter.get("/:id/runs/:runId", requireAuth, agents.getRun);
agentsRouter.post("/:id/runs/:runId/cancel", requireAuth, agents.cancelRun);
agentsRouter.post(
  "/",
  requireAdmin("Only admins can create agents"),
  validateBody(createAgentSchema),
  agents.create,
);
agentsRouter.patch(
  "/:id",
  requireAdmin("Only admins can edit agents"),
  validateBody(updateAgentSchema),
  agents.update,
);
agentsRouter.delete("/:id", requireAdmin("Only admins can delete agents"), agents.remove);
agentsRouter.post(
  "/:id/test",
  requireAdmin("Only admins can run agents"),
  validateBody(testAgentSchema),
  agents.test,
);
agentsRouter.post(
  "/:id/run",
  requireAdmin("Only admins can run agents"),
  validateBody(runAgentSchema),
  agents.run,
);

agentsRouter.use(agentsErrorHandler);
