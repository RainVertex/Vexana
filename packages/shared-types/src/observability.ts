import type { ID, ISODateString, Timestamped } from "./common";

export interface ServiceHealthSample extends Timestamped {
  id: ID;
  entityId: ID;
  status: "healthy" | "degraded" | "down";
  latencyMs?: number | null;
  errorRate?: number | null;
}

export interface DoraMetricsSnapshot extends Timestamped {
  id: ID;
  entityId: ID;
  periodStart: ISODateString;
  periodEnd: ISODateString;
  deployFrequencyPerDay: number;
  leadTimeHours: number;
  changeFailureRate: number;
  mttrHours: number;
}
