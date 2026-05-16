import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request, Response } from "express";

function userOrIpKey(req: Request, _res: Response): string {
  if (req.user?.id) return `u:${req.user.id}`;
  return `ip:${ipKeyGenerator(req.ip ?? "")}`;
}

const common = {
  standardHeaders: "draft-7" as const,
  legacyHeaders: false,
  message: { error: "Too many requests, try again later." },
};

export const authInitiateLimiter = rateLimit({
  ...common,
  windowMs: 10 * 60 * 1000,
  limit: 20,
});

export const authCallbackLimiter = rateLimit({
  ...common,
  windowMs: 10 * 60 * 1000,
  limit: 10,
});

export const authLogoutLimiter = rateLimit({
  ...common,
  windowMs: 10 * 60 * 1000,
  limit: 30,
  keyGenerator: userOrIpKey,
});

export const authMeLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: 120,
  keyGenerator: userOrIpKey,
});

export const adminLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: 60,
  keyGenerator: userOrIpKey,
});

export const apiLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: 300,
  keyGenerator: userOrIpKey,
});
