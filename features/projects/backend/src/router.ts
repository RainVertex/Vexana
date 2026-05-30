import { Router } from "express";
import { projectsRoutes } from "./routes/projects";
import { tasksRoutes } from "./routes/tasks";
import { bucketsRoutes } from "./routes/buckets";
import { labelsRoutes } from "./routes/labels";
import { commentsRoutes } from "./routes/comments";
import { usersRoutes } from "./routes/users";

export const projectsRouter: Router = Router();

projectsRouter.use(projectsRoutes);
projectsRouter.use(bucketsRoutes);
projectsRouter.use(tasksRoutes);
projectsRouter.use(labelsRoutes);
projectsRouter.use(commentsRoutes);
projectsRouter.use(usersRoutes);
