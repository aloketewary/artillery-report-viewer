import type {EChartsOption} from 'echarts';
import type {
  EndpointPerformance,
  ErrorSummary,
  PerformanceReport,
  ScenarioPerformance,
  TimelinePoint,
} from '../../model/performance-report';

/** Canonical display marker for values not supplied by the report or view projection. */
export const UNAVAILABLE_DISPLAY = 'N/A' as const;

export type PresentationAvailability = 'measured' | 'calculated' | 'unavailable';
export type AvailablePresentationAvailability = Exclude<PresentationAvailability, 'unavailable'>;

export interface AvailablePresentationValue<T> {
  readonly value: T;
  readonly display: string;
  readonly availability: AvailablePresentationAvailability;
  readonly context?: string;
}

export interface UnavailablePresentationValue<T> {
  readonly value?: undefined;
  readonly display: typeof UNAVAILABLE_DISPLAY;
  readonly availability: 'unavailable';
  readonly context?: string;
}

/** Display value contract. Unavailable values must carry the explicit N/A marker. */
export type PresentationValue<T> = AvailablePresentationValue<T> | UnavailablePresentationValue<T>;

export function unavailableValue<T>(context?: string): UnavailablePresentationValue<T> {
  return {
    display: UNAVAILABLE_DISPLAY,
    availability: 'unavailable',
    ...(context ? {context} : {}),
  };
}

export type StatusTone = 'healthy' | 'warning' | 'critical' | 'neutral';
export type ThemeMode = 'light' | 'dark';

/** Existing report section IDs, in the current anchored navigation order. */
export const REPORT_ANCHOR_IDS = [
  'overview',
  'performance',
  'endpoints',
  'scenarios',
  'errors',
  'comparison',
  'insights',
  'raw-data',
] as const;

export type ReportAnchorId = typeof REPORT_ANCHOR_IDS[number];

export interface ReportSectionNavigationItem {
  readonly id: ReportAnchorId;
  readonly label: string;
}

export const REPORT_SECTION_NAVIGATION: readonly ReportSectionNavigationItem[] = [
  {id: 'overview', label: 'Overview'},
  {id: 'performance', label: 'Performance'},
  {id: 'endpoints', label: 'Endpoints'},
  {id: 'scenarios', label: 'Scenarios'},
  {id: 'errors', label: 'Errors'},
  {id: 'comparison', label: 'Comparison'},
  {id: 'insights', label: 'Insights'},
  {id: 'raw-data', label: 'Raw Data'},
];

/** Fixed overview KPI keys and order. Do not derive or reorder this list from report data. */
export const KPI_KEYS = [
  'requests',
  'throughput',
  'errorRate',
  'p95',
  'p99',
  'duration',
] as const;

export type KpiKey = typeof KPI_KEYS[number];

export interface KpiDefinition {
  readonly key: KpiKey;
  readonly label: string;
}

export const KPI_DEFINITIONS: readonly KpiDefinition[] = [
  {key: 'requests', label: 'Requests'},
  {key: 'throughput', label: 'Throughput'},
  {key: 'errorRate', label: 'Error Rate'},
  {key: 'p95', label: 'P95 Latency'},
  {key: 'p99', label: 'P99 Latency'},
  {key: 'duration', label: 'Duration'},
];

export interface UiIntent<T extends string, P = undefined> {
  readonly type: T;
  readonly payload?: P;
}

export type ShellIntent =
  | UiIntent<'navigate', {readonly anchor: ReportAnchorId}>
  | UiIntent<'toggle-theme', {readonly mode: ThemeMode}>
  | UiIntent<'export'>
  | UiIntent<'download-json'>
  | UiIntent<'print'>
  | UiIntent<'reset'>;

export type EntryIntent =
  | UiIntent<'select-file', {readonly file: File}>
  | UiIntent<'drop-file', {readonly file: File}>
  | UiIntent<'load-sample'>
  | UiIntent<'cancel'>
  | UiIntent<'retry'>
  | UiIntent<'reset'>;

export type OverviewIntent =
  | UiIntent<'open-insight', {readonly key: string}>
  | UiIntent<'focus-raw-data', {readonly query: string}>;

export type TimelineMetric = 'latency' | 'throughput' | 'errors';
export type TimelineRange = '1m' | '5m' | '15m' | 'all';

export type TimelineIntent =
  | UiIntent<'metric-change', {readonly metric: TimelineMetric}>
  | UiIntent<'range-change', {readonly range: TimelineRange}>;

export type TableFilterName = 'endpoint-search' | 'method' | 'status' | 'errors' | 'scenario-search';
export type TableSortName = 'priority' | 'endpoint' | 'requests' | 'rps' | 'p95' | 'p99' | 'errorRate';

export type TableIntent =
  | UiIntent<'filter-change', {readonly filter: TableFilterName; readonly value: string}>
  | UiIntent<'sort-change', {readonly sort: TableSortName}>
  | UiIntent<'toggle-endpoint-detail', {readonly endpoint: string}>
  | UiIntent<'toggle-scenario-detail', {readonly scenario: string}>
  | UiIntent<'toggle-error-detail', {readonly key: string}>
  | UiIntent<'toggle-status-detail', {readonly code: string}>;

export type RawDataIntent =
  | UiIntent<'toggle-raw-data', {readonly open: boolean}>
  | UiIntent<'search-raw-data', {readonly query: string}>
  | UiIntent<'copy-raw-data'>
  | UiIntent<'download-raw-data'>;

export type ExportIntent = UiIntent<'export-report'>;

export type PresentationIntent =
  | ShellIntent
  | EntryIntent
  | OverviewIntent
  | TimelineIntent
  | TableIntent
  | RawDataIntent
  | ExportIntent;

export interface ReportContextPresentation {
  readonly fileName: PresentationValue<string>;
  readonly startedAt: PresentationValue<Date>;
  readonly format: PresentationValue<PerformanceReport['metadata']['format']>;
  readonly duration: PresentationValue<number>;
  readonly status: PresentationValue<StatusTone>;
  readonly statusLabel: string;
}

export interface ShellPresentation {
  readonly mode: 'entry' | 'report';
  readonly theme: ThemeMode;
  readonly reportContext?: ReportContextPresentation;
  readonly navigation: readonly ReportSectionNavigationItem[];
  readonly canExport: boolean;
  readonly canReset: boolean;
}

export type UploadUiState =
  | {readonly kind: 'idle'}
  | {readonly kind: 'drag-over'}
  | {readonly kind: 'reading'; readonly fileName?: string}
  | {readonly kind: 'processing'; readonly fileName?: string}
  | {readonly kind: 'ready'; readonly fileName: string}
  | {readonly kind: 'invalid-extension'; readonly message: string}
  | {readonly kind: 'invalid-json'; readonly message: string}
  | {readonly kind: 'unsupported-shape'; readonly message: string}
  | {readonly kind: 'retry'; readonly message: string};

export interface EntryPresentation {
  readonly upload: UploadUiState;
  readonly acceptedFileType: 'json';
  readonly localProcessingMessage: string;
  readonly canChooseFile: boolean;
  readonly canLoadSample: boolean;
  readonly canReset: boolean;
}

export interface PresentationMetric {
  readonly key: KpiKey;
  readonly label: string;
  readonly value: PresentationValue<string>;
  readonly detail: string;
  readonly tone: StatusTone;
  readonly target?: string;
  readonly comparison?: string;
  readonly progress?: number;
  readonly bars: readonly number[];
}

export interface ScorePartPresentation {
  readonly label: string;
  readonly value: PresentationValue<number>;
}

export interface PrioritySignalPresentation {
  readonly name: string;
  readonly count: PresentationValue<number>;
  readonly endpoint?: PresentationValue<string>;
  readonly sourceKey?: string;
}

export interface HealthPresentation {
  readonly score: PresentationValue<number>;
  readonly label: string;
  readonly tone: StatusTone;
  readonly breakdown: readonly ScorePartPresentation[];
  readonly explanation: string;
}

export interface OverviewPresentation {
  readonly identity: ReportContextPresentation;
  readonly metrics: readonly PresentationMetric[];
  readonly health: HealthPresentation;
  readonly prioritySignals: readonly PrioritySignalPresentation[];
}

export interface TimelinePresentation {
  readonly points: readonly TimelinePoint[];
  readonly metric: TimelineMetric;
  readonly range: TimelineRange;
  readonly hasData: boolean;
  readonly chartOptions?: EChartsOption;
  readonly accessibleLabel: string;
}

export interface EndpointTableRow {
  readonly endpoint: string;
  readonly method: PresentationValue<string>;
  readonly requests: PresentationValue<number>;
  readonly rps: PresentationValue<number>;
  readonly averageLatency: PresentationValue<number>;
  readonly p50: PresentationValue<number>;
  readonly p95: PresentationValue<number>;
  readonly p99: PresentationValue<number>;
  readonly errorRate: PresentationValue<number>;
  readonly status: PresentationValue<StatusTone>;
}

export interface ScenarioTableRow {
  readonly name: string;
  readonly requests: PresentationValue<number>;
  readonly virtualUsersCreated: PresentationValue<number>;
  readonly virtualUsersCompleted: PresentationValue<number>;
  readonly virtualUsersFailed: PresentationValue<number>;
  readonly virtualUsersSkipped: PresentationValue<number>;
  readonly rps: PresentationValue<number>;
  readonly p95: PresentationValue<number>;
  readonly p99: PresentationValue<number>;
  readonly errors: PresentationValue<number>;
  readonly errorRate: PresentationValue<number>;
  readonly status: PresentationValue<StatusTone>;
}

export interface StatusCodeTableRow {
  readonly code: string;
  readonly label: string;
  readonly count: PresentationValue<number>;
  readonly percentage: PresentationValue<number>;
  readonly tone: StatusTone;
}

export interface ErrorTableRow {
  readonly name: string;
  readonly count: PresentationValue<number>;
  readonly endpoint?: PresentationValue<string>;
  readonly sourceKey?: string;
}

export interface TablePresentation {
  readonly endpoints: readonly EndpointTableRow[];
  readonly scenarios: readonly ScenarioTableRow[];
  readonly statusCodes: readonly StatusCodeTableRow[];
  readonly errors: readonly ErrorTableRow[];
  readonly endpointSearch: string;
  readonly scenarioSearch: string;
  readonly methodFilter: string;
  readonly statusFilter: string;
  readonly errorFilter: string;
  readonly endpointSort: TableSortName;
}

export interface RawDataPresentation {
  readonly raw: PerformanceReport['raw'];
  readonly rawJson: string;
  readonly displayText: string;
  readonly search: string;
  readonly searchHasMatch: boolean;
  readonly statusMessage: string;
  readonly hasData: boolean;
}

export interface ExportPresentation {
  readonly report: PresentationReport;
  readonly canExport: boolean;
  readonly includesRawJson: false;
}

export interface PresentationReport {
  readonly identity: ReportContextPresentation;
  readonly metrics: readonly PresentationMetric[];
  readonly health: HealthPresentation;
  readonly timeline: readonly TimelinePoint[];
  readonly endpoints: readonly EndpointTableRow[];
  readonly scenarios: readonly ScenarioTableRow[];
  readonly errors: readonly ErrorTableRow[];
  readonly rawJson: string;
}

/** Read-only source aliases for projections; no domain model is replaced by these contracts. */
export type SourceEndpoint = Readonly<EndpointPerformance>;
export type SourceScenario = Readonly<ScenarioPerformance>;
export type SourceError = Readonly<ErrorSummary>;
