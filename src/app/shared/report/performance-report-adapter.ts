import { ReportItem } from '../../model/report-item';
import {
  EndpointPerformance,
  ErrorSummary,
  JsonRecord,
  Percentiles,
  PerformanceReport,
  ScenarioPerformance,
  StatusCounts,
  TimelinePoint,
} from '../../model/performance-report';
import { ParsedReport } from './report-adapter';

const ENDPOINT_SUMMARY_PREFIX = 'plugins.metrics-by-endpoint.response_time.';
const ENDPOINT_COUNTER_PREFIX = 'plugins.metrics-by-endpoint.';

export function normalizeArtilleryReport(parsed: ParsedReport, name: string): PerformanceReport {
  const rawAggregate = asRecord(parsed.raw['aggregate']);
  const aggregate = normalizeItem(rawAggregate, parsed.payload.aggregate);
  const rawIntermediate = Array.isArray(parsed.raw['intermediate'])
    ? parsed.raw['intermediate'].map(asRecord).filter((item): item is JsonRecord => item !== undefined)
    : [];
  const timeline = rawIntermediate.map((item, index) => normalizeTimelinePoint(item, parsed.payload.intermediate?.[index]));
  const startedAt = firstDate(
    toDate(rawAggregate?.['firstMetricAt']),
    timeline[0]?.at,
  );
  const endedAt = firstDate(
    toDate(rawAggregate?.['lastMetricAt']),
    timeline[timeline.length - 1]?.at,
  );
  const durationSeconds = startedAt && endedAt && endedAt >= startedAt
    ? (endedAt.getTime() - startedAt.getTime()) / 1000
    : undefined;
  const statusCounts = getStatusCounts(aggregate.statusCodes);
  const httpFailures = statusCounts.clientErrors + statusCounts.serverErrors;
  const runtimeErrors = sum(Object.values(aggregate.errors));
  const requests = aggregate.requestsCompleted;
  const errorCount = requests === undefined ? undefined : runtimeErrors + httpFailures;

  return {
    metadata: {
      name,
      format: 'artillery',
      sourceVersion: parsed.version,
      startedAt,
      endedAt,
      durationSeconds,
      hasCustomMetrics: parsed.hasCustomMetrics,
    },
    summary: {
      requestsCompleted: requests,
      throughputRps: aggregate.throughputRps,
      errorCount,
      errorRatePercent: requests && errorCount !== undefined ? errorCount / requests * 100 : undefined,
      failedRequests: httpFailures || runtimeErrors || undefined,
      statusCodes: aggregate.statusCodes,
      statusCounts,
      latency: aggregate.latency,
    },
    endpoints: normalizeEndpoints(rawAggregate, aggregate.latency, durationSeconds),
    scenarios: normalizeScenarios(aggregate.counters, aggregate.summaries, durationSeconds),
    errors: normalizeErrors(aggregate.errors),
    timeline,
    raw: parsed.raw,
  };
}

interface NormalizedItem {
  requestsCompleted?: number;
  throughputRps?: number;
  latency?: Percentiles;
  statusCodes: Record<string, number>;
  errors: Record<string, number>;
  counters: Record<string, number>;
  summaries: JsonRecord;
}

function normalizeItem(source: JsonRecord | undefined, fallback: ReportItem | undefined): NormalizedItem {
  const counters = numberMap(source?.['counters']);
  const rates = numberMap(source?.['rates']);
  const summaries = asRecord(source?.['summaries']) ?? {};
  const statusCodes = Object.keys(counters).length > 0
    ? mapCodes(counters)
    : numberMap(source?.['codes']);
  const errors = Object.keys(counters).length > 0
    ? mapErrors(counters)
    : numberMap(source?.['errors']);
  const requestsCompleted = firstNumber(counters, [
    'http.responses',
    'http.requests',
    'engine.http.responses',
    'engine.socketio.emit',
    'engine.websocket.message_sent',
    'engine.websocket.messages_sent',
  ]) ?? numberValue(fallback?.requestsCompleted);
  const throughputRps = firstNumber(rates, [
    'http.request_rate',
    'http.response_rate',
    'engine.http.response_rate',
    'engine.socketio.emit_rate',
    'engine.websocket.message_rate',
  ]) ?? numberValue(fallback?.rps?.mean);
  const latency = normalizeLatency(
    asRecord(summaries['http.response_time']) ?? asRecord(source?.['latency']),
    fallback?.latency,
  );

  return {
    requestsCompleted,
    throughputRps,
    latency,
    statusCodes: Object.keys(statusCodes).length > 0 ? statusCodes : numberMap(fallback?.codes),
    errors: Object.keys(errors).length > 0 ? errors : numberMap(fallback?.errors),
    counters,
    summaries,
  };
}

function normalizeTimelinePoint(source: JsonRecord, fallback: ReportItem | undefined): TimelinePoint {
  const item = normalizeItem(source, fallback);
  const errorCount = sum(Object.values(item.errors));
  return {
    at: toDate(source['period'] ?? source['timestamp']) ?? fallback?.timestamp,
    requestsCompleted: item.requestsCompleted,
    throughputRps: item.throughputRps,
    errorCount: errorCount || undefined,
    errorRatePercent: item.requestsCompleted !== undefined && item.requestsCompleted > 0 ? errorCount / item.requestsCompleted * 100 : undefined,
    latency: item.latency,
  };
}

function normalizeEndpoints(rawAggregate: JsonRecord | undefined, aggregateLatency: Percentiles | undefined, durationSeconds?: number): EndpointPerformance[] {
  const counters = numberMap(rawAggregate?.['counters']);
  const summaries = asRecord(rawAggregate?.['summaries']) ?? {};
  const endpointNames = new Set<string>();
  Object.keys(summaries).forEach((key) => {
    if (key.startsWith(ENDPOINT_SUMMARY_PREFIX)) {
      endpointNames.add(key.slice(ENDPOINT_SUMMARY_PREFIX.length));
    }
  });
  Object.keys(counters).forEach((key) => {
    if (key.startsWith(ENDPOINT_COUNTER_PREFIX)) {
      endpointNames.add(key.slice(ENDPOINT_COUNTER_PREFIX.length).split('.codes.')[0]);
    }
  });

  return [...endpointNames].map((name): EndpointPerformance => {
    const summary = asRecord(summaries[`${ENDPOINT_SUMMARY_PREFIX}${name}`]);
    const statusCodes = Object.entries(counters)
      .filter(([key]) => key.startsWith(`${ENDPOINT_COUNTER_PREFIX}${name}.codes.`))
      .reduce((result, [key, count]) => {
        const code = key.split('.codes.')[1];
        result[code] = count;
        return result;
      }, {} as Record<string, number>);
    const requests = numberValue(summary?.['count']) ?? (sum(Object.values(statusCodes)) || undefined);
    const errorCount = Object.entries(statusCodes)
      .filter(([code]) => Number(code) >= 400)
      .reduce((total, [, count]) => total + count, 0);

    return {
      name: name.startsWith('/') ? name : `/${name}`,
      method: undefined,
      requests,
      throughputRps: requests && durationSeconds ? requests / durationSeconds : undefined,
      latency: normalizeLatency(summary, undefined),
      statusCodes,
      errorCount: errorCount || undefined,
      errorRatePercent: requests && errorCount ? errorCount / requests * 100 : undefined,
    };
  }).sort((left, right) => (right.latency?.p99 ?? -1) - (left.latency?.p99 ?? -1));
}

function normalizeScenarios(counters: Record<string, number>, summaries: JsonRecord, durationSeconds?: number): ScenarioPerformance[] {
  const createdPrefix = 'vusers.created_by_name.';
  const completedPrefix = 'vusers.completed_by_name.';
  const failedPrefix = 'vusers.failed_by_name.';
  const skippedPrefix = 'vusers.skipped_by_name.';
  const requestPrefixes = ['http.responses_by_name.', 'http.requests_by_name.'];
  const errorPrefixes = ['errors_by_name.'];
  const latencyPrefix = 'plugins.metrics-by-scenario.response_time.';
  const names = new Set<string>();

  Object.keys(counters)
    .filter((key) => key.startsWith(createdPrefix) || key.startsWith(completedPrefix) || key.startsWith(failedPrefix) || key.startsWith(skippedPrefix) || requestPrefixes.some((prefix) => key.startsWith(prefix)) || errorPrefixes.some((prefix) => key.startsWith(prefix)))
    .forEach((key) => {
      const prefixes = [createdPrefix, completedPrefix, failedPrefix, skippedPrefix, ...requestPrefixes, ...errorPrefixes];
      const prefix = prefixes.find((candidate) => key.startsWith(candidate));
      const name = prefix ? key.slice(prefix.length) : '';
      if (name) names.add(name);
    });
  Object.keys(summaries).filter((key) => key.startsWith(latencyPrefix)).forEach((key) => names.add(key.slice(latencyPrefix.length)));

  return [...names]
    .map((name): ScenarioPerformance => {
      const requests = firstNamedCounter(counters, requestPrefixes, name);
      const errorCount = firstNamedCounter(counters, errorPrefixes, name);
      const latency = normalizeLatency(asRecord(summaries[`${latencyPrefix}${name}`]), undefined);
      return {
        name,
        requests,
        throughputRps: requests !== undefined && durationSeconds && durationSeconds > 0 ? requests / durationSeconds : undefined,
        latency,
        virtualUsersCreated: counters[`${createdPrefix}${name}`],
        virtualUsersCompleted: counters[`${completedPrefix}${name}`],
        virtualUsersFailed: counters[`${failedPrefix}${name}`],
        virtualUsersSkipped: counters[`${skippedPrefix}${name}`],
        errorCount,
        errorRatePercent: requests !== undefined && requests > 0 && errorCount !== undefined ? errorCount / requests * 100 : undefined,
      };
    })
    .sort((left, right) => (right.virtualUsersCreated ?? 0) - (left.virtualUsersCreated ?? 0) || left.name.localeCompare(right.name))
    .slice(0, 6);
}

function firstNamedCounter(counters: Record<string, number>, prefixes: string[], name: string): number | undefined {
  for (const prefix of prefixes) {
    const value = counters[`${prefix}${name}`];
    if (value !== undefined) return value;
  }
  return undefined;
}

function normalizeErrors(errors: Record<string, number>): ErrorSummary[] {
  return Object.entries(errors)
    .sort(([, left], [, right]) => right - left)
    .slice(0, 5)
    .map(([name, count]) => ({
      name: name.replace(/_/g, ' '),
      count,
      sourceKey: name,
      endpoint: name.match(/(\/[^\s]+)/)?.[1],
    }));
}

function normalizeLatency(source: JsonRecord | undefined, fallback: ReportItem['latency'] | undefined): Percentiles | undefined {
  if (!source && !fallback) {
    return undefined;
  }
  return {
    min: numberValue(source?.['min']) ?? numberValue(fallback?.min),
    max: numberValue(source?.['max']) ?? numberValue(fallback?.max),
    mean: numberValue(source?.['mean']),
    median: numberValue(source?.['median']) ?? numberValue(fallback?.median),
    p50: numberValue(source?.['p50']) ?? numberValue(fallback?.p50),
    p75: numberValue(source?.['p75']) ?? numberValue(fallback?.p75),
    p90: numberValue(source?.['p90']) ?? numberValue(fallback?.p90),
    p95: numberValue(source?.['p95']) ?? numberValue(fallback?.p95),
    p99: numberValue(source?.['p99']) ?? numberValue(fallback?.p99),
  };
}

function getStatusCounts(codes: Record<string, number>): StatusCounts {
  return Object.entries(codes).reduce((result, [code, count]) => {
    const numericCode = Number(code);
    if (numericCode >= 500) result.serverErrors += count;
    else if (numericCode >= 400) result.clientErrors += count;
    else if (numericCode >= 300) result.redirects += count;
    else if (numericCode >= 200) result.success += count;
    return result;
  }, { success: 0, redirects: 0, clientErrors: 0, serverErrors: 0 });
}

function mapCodes(counters: Record<string, number>): Record<string, number> {
  return Object.entries(counters).reduce((result, [key, value]) => {
    const marker = '.codes.';
    const markerIndex = key.indexOf(marker);
    const supported = key.startsWith('http.codes.') || (key.startsWith('engine.') && markerIndex >= 0);
    if (supported && markerIndex >= 0) {
      const code = key.slice(markerIndex + marker.length);
      if (/^\d{3}$/.test(code)) result[code] = (result[code] ?? 0) + value;
    }
    return result;
  }, {} as Record<string, number>);
}

function mapErrors(counters: Record<string, number>): Record<string, number> {
  return Object.entries(counters).reduce((result, [key, value]) => {
    const marker = key.startsWith('errors.') ? 'errors.' : '.errors.';
    const markerIndex = key.indexOf(marker);
    if (markerIndex >= 0) {
      const name = key.slice(markerIndex + marker.length);
      if (name) result[name] = (result[name] ?? 0) + value;
    }
    return result;
  }, {} as Record<string, number>);
}

function numberMap(value: unknown): Record<string, number> {
  const record = asRecord(value);
  if (!record) return {};
  return Object.entries(record).reduce((result, [key, raw]) => {
    const number = numberValue(raw);
    if (number !== undefined) result[key] = number;
    return result;
  }, {} as Record<string, number>);
}

function firstNumber(values: Record<string, number>, keys: string[]): number | undefined {
  for (const key of keys) {
    if (values[key] !== undefined) return values[key];
  }
  return undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) {
    const date = new Date(Number(value));
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
}

function firstDate(primary?: Date, fallback?: Date): Date | undefined {
  return primary ?? fallback;
}

function asRecord(value: unknown): JsonRecord | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : undefined;
}
