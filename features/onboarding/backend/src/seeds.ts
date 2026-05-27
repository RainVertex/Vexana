export interface SeedTask {
  kind: string;
  payload: Record<string, unknown>;
  condition?: "plane-integration-exists";
}

export const SEED_TASKS: SeedTask[] = [
  { kind: "request-tool-access", payload: {} },
  { kind: "team-join", payload: {} },
  { kind: "connect-plane", payload: {}, condition: "plane-integration-exists" },
];
