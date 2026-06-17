// DTO types for observability (service health, DORA, Grafana/Loki/Tempo wiring and payloads).
import type { ID, ISODateString, Timestamped } from "@internal/shared-types";

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

// Query fields are nullable so an admin can enable just logs or just health independently.
export interface EntityObservabilityConfigDto {
  entityId: ID;
  integrationId: ID;
  upQuery: string | null;
  latencyQuery: string | null;
  errorQuery: string | null;
  logsSelector: string | null;
  dashboardUid: string | null;
  traceIdRegex: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// All optional (a Grafana may expose only a subset), but the scrape job hard-requires prometheus.
export interface GrafanaDataSourceUids {
  prometheus?: string;
  loki?: string;
  tempo?: string;
}

export type { LokiLogLine, TempoSpan, TempoTrace } from "@internal/shared-types";
