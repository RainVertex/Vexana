import type { Request, Response, NextFunction } from "express";
import type { z } from "zod";

// Parses the request body against the schema, answers 400 with the Zod issues on failure, and stashes
// the parsed value on res.locals.body for the controller to read.
export function validateBody(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
      return;
    }
    res.locals.body = parsed.data;
    next();
  };
}
