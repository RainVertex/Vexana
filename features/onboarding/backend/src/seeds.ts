export interface SeedTask {
  kind: string;
  payload: Record<string, unknown>;
}

export const SEED_TASKS: SeedTask[] = [{ kind: "team-join", payload: {} }];
