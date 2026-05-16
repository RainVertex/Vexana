import type { ErrorRequestHandler } from "express";
import { logger } from "../logger/logger";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message ?? "Internal Server Error";
  const code = (err as { code?: string }).code;
  const meta = (err as { meta?: unknown }).meta;

  const log = req.log ?? logger;
  log.error(
    {
      err,
      statusCode,
      code,
      meta,
      method: req.method,
      url: req.url,
    },
    message,
  );

  res.status(statusCode).json({
    error: message,
    ...(code ? { code } : {}),
    ...(meta ? { meta } : {}),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
