import { Router } from "express";
import * as llm from "../controllers/llm";
import { agentsErrorHandler } from "../errors";

export const llmRouter: Router = Router();

llmRouter.get("/models", llm.models);
llmRouter.get("/recommendations", llm.recommendations);

llmRouter.use(agentsErrorHandler);
