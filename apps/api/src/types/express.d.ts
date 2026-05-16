import type { User } from "@internal/db";
import type { Logger } from "pino";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      id?: string;
      log: Logger;
    }
  }
}

export {};
