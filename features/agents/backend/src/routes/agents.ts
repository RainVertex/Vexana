import { Router } from "express";
import * as agents from "../controllers/agents";
import { agentsErrorHandler } from "../errors";
import {
  createAgentSchema,
  createMcpServerSchema,
  runAgentSchema,
  testAgentSchema,
  updateAgentSchema,
  updateMcpServerSchema,
} from "../dto";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

export const agentsRouter: Router = Router();

agentsRouter.get("/", requireAuth, agents.list);
agentsRouter.get("/tools", requireAuth, agents.tools);
// Registered before the /:id routes so the literal "mcp" segment is never captured as an agent id.
agentsRouter.get("/mcp/oauth/callback", requireAuth, agents.mcpOAuthCallback);
agentsRouter.get("/:id", requireAuth, agents.detail);
agentsRouter.get("/:id/runs/:runId", requireAuth, agents.getRun);
agentsRouter.post("/:id/runs/:runId/cancel", requireAuth, agents.cancelRun);
agentsRouter.get("/:id/mcp-servers", requireAuth, agents.listMcpServers);
agentsRouter.post(
  "/:id/mcp-servers",
  requireAdmin("Only admins can attach MCP servers"),
  validateBody(createMcpServerSchema),
  agents.createMcpServer,
);
agentsRouter.patch(
  "/:id/mcp-servers/:sid",
  requireAdmin("Only admins can edit MCP servers"),
  validateBody(updateMcpServerSchema),
  agents.updateMcpServer,
);
agentsRouter.delete(
  "/:id/mcp-servers/:sid",
  requireAdmin("Only admins can remove MCP servers"),
  agents.deleteMcpServer,
);
agentsRouter.post(
  "/:id/mcp-servers/:sid/probe",
  requireAdmin("Only admins can probe MCP servers"),
  agents.probeMcpServer,
);
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
