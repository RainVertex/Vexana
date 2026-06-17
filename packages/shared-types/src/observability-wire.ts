// Trace/log wire shapes shared between the grafana-client package and the observability feature.
// They live in shared-types because grafana-client (a shared package) consumes them, and shared
// packages cannot import feature packages.
import type { ISODateString } from "./common";

// traceId is extracted backend-side via per-entity regex and is what makes a row clickable.
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
