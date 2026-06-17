import type { ID, ISODateString } from "@internal/shared-types";

export interface NotificationDto {
  id: ID;
  kind: string;
  payload: Record<string, unknown>;
  readAt: ISODateString | null;
  createdAt: ISODateString;
}
