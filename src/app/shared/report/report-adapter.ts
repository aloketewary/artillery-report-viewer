import { ReportItem, Latency, Rps } from '../../model/report-item';
import { ReportPayload } from '../../model/report-payload';
import { ReportPhase } from '../../model/report-phase';
import { ReportValidationError } from './report-validation-error';

export type JsonRecord = Record<string, unknown>;

export interface ParsedReport {
  raw: JsonRecord;
  payload: ReportPayload;
  version: 1 | 2;
  hasCustomMetrics: boolean;
}

const MODERN_FIELDS = ['counters', 'rates', 'summaries', 'histograms', 'period'];
const LEGACY_FIELDS = ['latency', 'rps', 'codes', 'errors', 'requestsCompleted', 'timestamp', 'scenariosCreated', 'scenariosCompleted'];
const DEFAULT_METRIC_PREFIXES = ['vusers.', 'core.vusers.', 'http.', 'errors.', 'engine.'];
const LATENCY_KEYS = [
  'http.response_time',
  'engine.http.response_time',
  'engine.websocket.response_time',
  'engine.socketio.response_time',
];

export function parseArtilleryReport(value: unknown): ParsedReport {
  const raw = asRecord(value);
  if (!raw) {
    throw new ReportValidationError('invalid-root');
  }

  const aggregate = asRecord(raw['aggregate']);
  const intermediate = raw['intermediate'];
  if (!aggregate && !Array.isArray(intermediate)) {
    throw new ReportValidationError('unsupported-format');
  }
  if (!isRecognizedArtilleryReport(aggregate, intermediate)) {
    throw new ReportValidationError('unsupported-schema');
  }

  const modern = isModernReport(aggregate, intermediate);
  const payload: ReportPayload = {
    aggregate: modern ? mapModernItem(aggregate) : mapLegacyItem(aggregate),
    intermediate: Array.isArray(intermediate)
      ? intermediate
        .map(asRecord)
        .filter((item): item is JsonRecord => item !== undefined)
        .map((item) => modern ? mapModernItem(item) : mapLegacyItem(item))
      : [],
  };
  const reportPhases = mapPhases(raw['phases'] ?? asRecord(raw['config'])?.['phases']);
  if (reportPhases.length > 0 && payload.aggregate) {
    payload.aggregate.phases = reportPhases;
  }

  return {
    raw,
    payload,
    version: modern ? 2 : 1,
    hasCustomMetrics: hasCustomMetrics(aggregate),
  };
}

function isRecognizedArtilleryReport(aggregate: JsonRecord | undefined, intermediate: unknown): boolean {
  const items = [
    aggregate,
    ...(Array.isArray(intermediate) ? intermediate.map(asRecord) : []),
  ].filter((item): item is JsonRecord => item !== undefined);
  return items.some((item) => MODERN_FIELDS.some((field) => field in item) || LEGACY_FIELDS.some((field) => field in item));
}

function isModernReport(aggregate: JsonRecord | undefined, intermediate: unknown): boolean {
  const aggregateIsModern = aggregate ? MODERN_FIELDS.some((field) => field in aggregate) : false;
  const intermediateIsModern = Array.isArray(intermediate)
    && intermediate.some((item) => {
      const record = asRecord(item);
      return record ? MODERN_FIELDS.some((field) => field in record) : false;
    });
  return aggregateIsModern || intermediateIsModern;
}

function mapModernItem(source: JsonRecord | undefined): ReportItem {
  const item = source ?? {};
  const legacy = mapLegacyItem(item);
  const counters = numberMap(item['counters']);
  const rates = numberMap(item['rates']);
  const summaries = recordMap(item['summaries']);
  const histograms = recordMap(item['histograms']);
  const requestsCompleted = firstMetricValue(counters, [
    'http.responses',
    'http.requests',
    'engine.http.responses',
    'engine.socketio.emit',
    'engine.websocket.message_sent',
    'engine.websocket.messages_sent',
  ]) ?? legacy.requestsCompleted ?? 0;
  const mappedCodes = mapCodes(counters);
  const mappedErrors = mapErrors(counters);
  const mappedPhases = mapPhases(item['phases']);
  const latency = Object.keys(summaries).length > 0 ? mapLatency(summaries) : legacy.latency ?? new Latency();

  return {
    ...legacy,
    timestamp: toDate(item['period'] ?? item['timestamp'] ?? item['lastMetricAt'] ?? item['firstMetricAt']) ?? legacy.timestamp,
    period: numberOrString(item['period']),
    scenariosCreated: firstMetricValue(counters, ['vusers.created', 'core.vusers.created.total']) ?? legacy.scenariosCreated ?? 0,
    scenariosCompleted: firstMetricValue(counters, ['vusers.completed', 'core.vusers.completed']) ?? legacy.scenariosCompleted ?? 0,
    scenariosAvoided: firstMetricValue(counters, ['vusers.skipped', 'core.vusers.skipped']) ?? legacy.scenariosAvoided ?? 0,
    requestsCompleted,
    latency,
    rps: {
      mean: firstMetricValue(rates, [
        'http.request_rate',
        'http.response_rate',
        'engine.http.response_rate',
        'engine.socketio.emit_rate',
        'engine.websocket.message_rate',
      ]) ?? legacy.rps?.mean ?? 0,
      count: requestsCompleted,
    } as Rps,
    codes: Object.keys(mappedCodes).length > 0 ? mappedCodes : legacy.codes ?? {},
    errors: Object.keys(mappedErrors).length > 0 ? mappedErrors : legacy.errors ?? {},
    phases: mappedPhases.length > 0 ? mappedPhases : legacy.phases ?? [],
    counters,
    rates,
    summaries,
    histograms,
    customStats: recordMap(item['customStats']),
  };
}

function mapLegacyItem(source: JsonRecord | undefined): ReportItem {
  const item = source ?? {};
  return {
    ...item,
    timestamp: toDate(item['timestamp'] ?? item['period']),
    latency: mapLatency(asRecord(item['latency'])),
    rps: mapRps(asRecord(item['rps'])),
    codes: numberMap(item['codes']),
    errors: numberMap(item['errors']),
    phases: mapPhases(item['phases']),
  } as ReportItem;
}

function mapLatency(value: JsonRecord | undefined): Latency {
  const source = value ?? {};
  if (hasLatencyFields(source)) {
    const median = toNumber(source['median']) ?? toNumber(source['p50']) ?? 0;
    return {
      min: toNumber(source['min']) ?? 0,
      max: toNumber(source['max']) ?? 0,
      median,
      p50: toNumber(source['p50']) ?? median,
      p95: toNumber(source['p95']) ?? 0,
      p99: toNumber(source['p99']) ?? 0,
    };
  }

  const selected = LATENCY_KEYS
    .map((key) => asRecord(source[key]))
    .find((summary) => summary !== undefined)
    ?? Object.keys(source)
      .filter((key) => key.endsWith('response_time'))
      .map((key) => asRecord(source[key]))
      .find((summary) => summary !== undefined);

  if (!selected) {
    return new Latency();
  }

  const median = toNumber(selected['median']) ?? toNumber(selected['p50']) ?? 0;
  return {
    min: toNumber(selected['min']) ?? 0,
    max: toNumber(selected['max']) ?? 0,
    median,
    p50: toNumber(selected['p50']) ?? median,
    p95: toNumber(selected['p95']) ?? 0,
    p99: toNumber(selected['p99']) ?? 0,
  };
}

function hasLatencyFields(value: JsonRecord): boolean {
  return ['min', 'max', 'median', 'p50', 'p95', 'p99'].some((key) => key in value);
}

function mapRps(value: JsonRecord | undefined): Rps {
  return {
    count: toNumber(value?.['count']) ?? 0,
    mean: toNumber(value?.['mean']) ?? 0,
  };
}

function mapCodes(counters: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(counters)) {
    const marker = '.codes.';
    const markerIndex = key.indexOf(marker);
    const isSupportedNamespace = key.startsWith('http.codes.')
      || (key.startsWith('engine.') && markerIndex >= 0);
    if (!isSupportedNamespace || markerIndex < 0) {
      continue;
    }
    const code = key.slice(markerIndex + marker.length);
    if (/^\d{3}$/.test(code)) {
      result[code] = (result[code] ?? 0) + value;
    }
  }
  return result;
}

function mapErrors(counters: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(counters)) {
    const marker = key.startsWith('errors.') ? 'errors.' : '.errors.';
    const markerIndex = key.indexOf(marker);
    if (markerIndex < 0) {
      continue;
    }
    const name = key.slice(markerIndex + marker.length);
    if (name) {
      result[name] = (result[name] ?? 0) + value;
    }
  }
  return result;
}

function mapPhases(value: unknown): ReportPhase[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(asRecord)
    .filter((phase): phase is JsonRecord => phase !== undefined)
    .map((phase) => ({
      name: typeof phase['name'] === 'string' ? phase['name'] : undefined,
      duration: toNumber(phase['duration']),
      arrivalRate: toNumber(phase['arrivalRate']),
      rampTo: toNumber(phase['rampTo']),
      maxVusers: toNumber(phase['maxVusers']),
    }));
}

function hasCustomMetrics(aggregate: JsonRecord | undefined): boolean {
  if (!aggregate) {
    return false;
  }
  const customStats = asRecord(aggregate['customStats']);
  if (customStats && Object.keys(customStats).length > 0) {
    return true;
  }
  const counters = asRecord(aggregate['counters']);
  return counters
    ? Object.keys(counters).some((key) => !DEFAULT_METRIC_PREFIXES.some((prefix) => key.startsWith(prefix)))
    : false;
}

function firstMetricValue(values: Record<string, number>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = values[key];
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

function numberMap(value: unknown): Record<string, number> {
  const record = asRecord(value);
  if (!record) {
    return {};
  }
  const result: Record<string, number> = {};
  for (const [key, rawValue] of Object.entries(record)) {
    const number = toNumber(rawValue);
    if (number !== undefined) {
      result[key] = number;
    }
  }
  return result;
}

function recordMap(value: unknown): Record<string, unknown> {
  return asRecord(value) ?? {};
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  }
  return undefined;
}

function numberOrString(value: unknown): number | string | undefined {
  return typeof value === 'string' || typeof value === 'number' ? value : undefined;
}

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
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

function asRecord(value: unknown): JsonRecord | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : undefined;
}
