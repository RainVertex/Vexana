import { pino, type Logger, type LoggerOptions } from "pino";

const isDev = (process.env.NODE_ENV ?? "development") === "development";

const baseOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  base: { service: "mep-api" },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      "*.password",
      "*.token",
      "*.secret",
    ],
    censor: "[redacted]",
  },
};

export const logger: Logger = isDev
  ? pino({
      ...baseOptions,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss.l",
          singleLine: false,
          ignore: "pid,hostname,service",
        },
      },
    })
  : pino(baseOptions);

export type { Logger };
