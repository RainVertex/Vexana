import type { ID, ISODateString } from "./common";

export interface AuditEventActor {
  id: ID;
  displayName: string;
  githubLogin: string;
  avatarUrl?: string | null;
}

export interface AuditEventRow {
  id: ID;
  kind: string;
  actor: AuditEventActor | null;
  actorIp?: string | null;
  targetKind?: string | null;
  targetId?: string | null;
  requestId?: string | null;
  payload: Record<string, unknown>;
  createdAt: ISODateString;
}
