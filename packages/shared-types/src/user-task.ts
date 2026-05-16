import type { ID, ISODateString } from "./common";

export type UserTaskStatus = "pending" | "completed" | "dismissed";

/** A single onboarding/checklist task for the current user. */
export interface UserTaskDto {
  id: ID;
  kind: string;
  status: UserTaskStatus;
  payload: Record<string, unknown> | null;
  createdAt: ISODateString;
  completedAt: ISODateString | null;
}
