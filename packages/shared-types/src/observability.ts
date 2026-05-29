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

// Per-entity wiring for the Grafana scrape job and logs panel. All query
// fields are nullable so an admin can enable just logs (logsSelector) or just
// health (upQuery) without committing to the full set.
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

// Auto-detected Grafana datasource UIDs the platform speaks through. All
// optional because an admin may connect a Grafana that only has a subset
// (e.g. logs-only setup). The scrape job hard-requires `prometheus`.
export interface GrafanaDataSourceUids {
  prometheus?: string;
  loki?: string;
  tempo?: string;
}

// Single Loki log line surfaced from a stream. `traceId` is extracted on the
// backend via per-entity regex (or the grafana-client default list) and is
// what makes a row clickable in EntityLogsPanel, clicking opens TraceDrawer.
export interface LokiLogLine {
  ts: ISODateString;
  line: string;
  labels: Record<string, string>;
  traceId?: string | null;
}

export interface TempoSpan {
  spanId: string;
  parentSpanId?: string | null;
  name: string;
  service: string;
  startMs: number;
  durationMs: number;
  attributes: Record<string, unknown>;
}

export interface TempoTrace {
  traceId: string;
  rootService: string;
  rootName: string;
  durationMs: number;
  spans: TempoSpan[];
}
