import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

// The message preserves the endpoint specific copy the inline checks used to return.
export function requireAdmin(message: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (req.user.role !== "admin") {
      res.status(403).json({ error: message });
      return;
    }
    next();
  };
}
