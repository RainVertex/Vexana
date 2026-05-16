import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";

const HEADER = "x-request-id";

export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.get(HEADER);
  const id =
    incoming && /^[a-zA-Z0-9_-]{6,64}$/.test(incoming)
      ? incoming
      : randomUUID().replace(/-/g, "").slice(0, 12);
  req.id = id;
  res.setHeader(HEADER, id);
  next();
};
