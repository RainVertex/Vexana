/** Default onboarding tasks seeded for every user on first list. */
export interface SeedTask {
  kind: string;
  /** Default Json payload stored on the row. */
  payload: Record<string, unknown>;
}

export const SEED_TASKS: SeedTask[] = [
  {
    kind: "request-tool-access",
    payload: {},
  },
  {
    kind: "team-join",
    payload: {},
  },
];
