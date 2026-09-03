export type JsonRecord = Record<string, unknown>;

export interface Percentiles {
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  p50?: number;
  p75?: number;
  p90?: number;
  p95?: number;
  p99?: number;
}

export interface StatusCounts {
  success: number;
  redirects: number;
  clientErrors: number;
  serverErrors: number;
}

export interface EndpointPerformance {
  name: string;
  method?: string;
  requests?: number;
  throughputRps?: number;
  latency?: Percentiles;
  statusCodes: Record<string, number>;
  errorCount?: number;
  errorRatePercent?: number;
}

export interface ScenarioPerformance {
  name: string;
  virtualUsersCreated?: number;
  virtualUsersCompleted?: number;
  virtualUsersFailed?: number;
  virtualUsersSkipped?: number;
  errorCount?: number;
}

export interface ErrorSummary {
  name: string;
  count: number;
  endpoint?: string;
}

export interface TimelinePoint {
  at?: Date;
  requestsCompleted?: number;
  throughputRps?: number;
  errorCount?: number;
  errorRatePercent?: number;
  latency?: Percentiles;
}

export interface PerformanceReport {
  metadata: {
    name: string;
    format: 'artillery';
    sourceVersion: 1 | 2;
    startedAt?: Date;
    endedAt?: Date;
    durationSeconds?: number;
    hasCustomMetrics: boolean;
  };
  summary: {
    requestsCompleted?: number;
    throughputRps?: number;
    errorCount?: number;
    errorRatePercent?: number;
    failedRequests?: number;
    statusCodes: Record<string, number>;
    statusCounts: StatusCounts;
    latency?: Percentiles;
  };
  endpoints: EndpointPerformance[];
  scenarios: ScenarioPerformance[];
  errors: ErrorSummary[];
  timeline: TimelinePoint[];
  raw: JsonRecord;
}
