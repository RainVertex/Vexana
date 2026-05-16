import type { JobDefinition } from "./types";

export const heartbeatJob: JobDefinition = {
  name: "platform.heartbeat",
  schedule: "*/5 * * * *",
  timeoutMs: 10_000,
  handler: async ({ log }) => {
    log.info("heartbeat ok");
  },
};
