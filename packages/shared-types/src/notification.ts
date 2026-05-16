import type { ID, ISODateString } from "./common";

export interface NotificationDto {
  id: ID;
  kind: string;
  payload: Record<string, unknown>;
  readAt: ISODateString | null;
  createdAt: ISODateString;
}
