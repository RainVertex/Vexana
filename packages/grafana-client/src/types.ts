// Grafana HTTP API response types. Keep these narrow to what the client
// actually uses — Grafana's full surface is huge and largely irrelevant to
// the integration. UI-facing DTOs (LokiLogLine, TempoTrace, ...) live in
// @internal/shared-types and are derived from these in the normalizers.

export interface GrafanaClientConfig {
  baseUrl: string;
  apiToken: string;
  /** Optional fetch override — used by tests to inject a stub. */
  fetch?: typeof fetch;
}

export interface GrafanaDataSource {
  uid: string;
  name: string;
  type: string;
  isDefault: boolean;
}

export interface PromInstantResult {
  status: "success" | "error";
  data: {
    resultType: "vector" | "scalar" | "matrix" | "string";
    result: Array<{
      metric: Record<string, string>;
      value?: [number, string];
      values?: Array<[number, string]>;
    }>;
  };
  errorType?: string;
  error?: string;
}

export interface PromRangeResult {
  status: "success" | "error";
  data: {
    resultType: "matrix";
    result: Array<{
      metric: Record<string, string>;
      values: Array<[number, string]>;
    }>;
  };
  errorType?: string;
  error?: string;
}

export interface LokiQueryResult {
  status: "success" | "error";
  data: {
    resultType: "streams" | "matrix" | "vector";
    result: Array<{
      stream?: Record<string, string>;
      values?: Array<[string, string]>;
    }>;
  };
  errorType?: string;
  error?: string;
}

// Tempo trace responses follow an OTLP-shaped JSON: `batches[].scopeSpans[].spans[]`.
// We only model what the normalizer reads.
export interface TempoApiResponse {
  batches: Array<{
    resource?: {
      attributes?: Array<{ key: string; value?: TempoAttrValue }>;
    };
    scopeSpans?: Array<{
      spans?: Array<TempoApiSpan>;
    }>;
    instrumentationLibrarySpans?: Array<{
      spans?: Array<TempoApiSpan>;
    }>;
  }>;
}

export interface TempoAttrValue {
  stringValue?: string;
  intValue?: string | number;
  boolValue?: boolean;
  doubleValue?: number;
}

export interface TempoApiSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTimeUnixNano?: string | number;
  endTimeUnixNano?: string | number;
  attributes?: Array<{ key: string; value?: TempoAttrValue }>;
}

export interface PromRange {
  start: Date;
  end: Date;
  stepSec: number;
}

export interface LokiRange {
  start: Date;
  end: Date;
  limit?: number;
  direction?: "forward" | "backward";
}

export interface RenderPanelOpts {
  dashboardUid: string;
  panelId: number;
  from?: string;
  to?: string;
  width?: number;
  height?: number;
}
