import type { Request, Response, NextFunction } from "express";

// Domain errors carry the HTTP status and response body the route should return, so services can
// throw them and stay free of req/res. The error middleware below translates them.
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly body: Record<string, unknown>,
  ) {
    super(typeof body.error === "string" ? body.error : "Request failed");
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, code?: string) {
    super(400, code ? { error: message, code } : { error: message });
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(403, { error: message });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, { error: message });
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, { error: message });
  }
}

export function agentsErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.status).json(err.body);
    return;
  }
  console.error("Unhandled agents route error:", err);
  res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
}
