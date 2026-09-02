import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { EChartsOption } from 'echarts';
import { FileUploadComponent } from '../file-upload/file-upload.component';
import { ReportItem } from '../model/report-item';
import { ReportPayload } from '../model/report-payload';
import { ReportState } from '../model/report-state';
import { parseArtilleryReport } from '../shared/report/report-adapter';

type ChartMetric = 'latency' | 'throughput' | 'errors';
type ChartRange = '1m' | '5m' | '15m' | 'all';
type StatusTone = 'healthy' | 'warning' | 'critical' | 'neutral';

interface MetricCard {
  label: string;
  value: string;
  detail: string;
  trend: string;
  tone: StatusTone;
  target?: string;
  progress?: number;
  bars: number[];
}

interface EndpointRow {
  endpoint: string;
  method: string;
  requests?: number;
  rps?: number;
  avg?: number;
  p50?: number;
  p95?: number;
  p99?: number;
  errorRate?: number;
  status: StatusTone;
}

interface ScenarioRow {
  name: string;
  requests?: number;
  rps?: number;
  p95?: number;
  p99?: number;
  errors?: number;
  status: StatusTone;
}

interface ErrorRow {
  name: string;
  count: number;
  endpoint?: string;
}

interface DashboardView {
  fileName: string;
  timestamp?: Date;
  duration?: number;
  requests?: number;
  throughput?: number;
  errorCount?: number;
  errorRate?: number;
  failedRequests?: number;
  p95?: number;
  p99?: number;
  latency?: ReportItem['latency'];
  status: StatusTone;
  statusLabel: string;
  healthScore?: number;
  healthLabel: string;
  scoreParts: Array<{ label: string; value?: number }>;
  insight: string;
  metrics: MetricCard[];
  endpoints: EndpointRow[];
  scenarios: ScenarioRow[];
  errors: ErrorRow[];
  codes: Array<{ code: string; count: number; percentage: number; tone: StatusTone }>;
  statusCounts: { success: number; redirects: number; client: number; server: number };
  latencyPercentiles: Array<{ label: string; value?: number; emphasis?: boolean }>;
  raw: unknown;
  rawJson: string;
  hasTimeline: boolean;
}

interface JsonRecord {
  [key: string]: unknown;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: false,
})
export class HomeComponent implements OnInit {
  reportState = new ReportState();
  errorMessage = '';
  isDarkMode = false;
  activeNav = 'Overview';
  chartMetric: ChartMetric = 'latency';
  chartRange: ChartRange = 'all';
  chartOptions: EChartsOption = {};
  copyStatus = '';
  rawSearch = '';
  endpointSearch = '';
  statusFilter = 'all';
  endpointSort: keyof EndpointRow = 'p95';
  readonly Math = Math;
  reportView: DashboardView = this.emptyView();

  @ViewChild('fileUploadComp', { static: false }) fileUploadComp?: FileUploadComponent;

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<unknown>('assets/report.json').subscribe({
      next: (source) => {
        if (!this.reportState.isLoaded) {
          this.loadSource(source, 'report.json');
        }
      },
      error: () => {
        // Upload remains available when no local fixture is present.
      },
    });
  }

  reset(_: string): void {
    this.reportState = new ReportState();
    this.reportView = this.emptyView();
    this.errorMessage = '';
    this.rawSearch = '';
  }

  onReportUploadAndProcessed(data: ReportState): void {
    try {
      const source = data.report?.rawResults ?? data.report?.results;
      if (!source) {
        throw new Error('Report data is missing.');
      }
      this.loadSource(source, data.report?.name || 'report.json');
    } catch (error: unknown) {
      this.onFileError(error instanceof Error ? error.message : 'Unable to parse report.');
    }
  }

  onFileError(message: string): void {
    this.errorMessage = message;
    this.reportState = new ReportState();
    this.reportView = this.emptyView();
    this.fileUploadComp?.reset(false);
  }

  onDownloadHit(): void {
    const raw = this.reportView.raw;
    if (!raw) {
      return;
    }

    const blob = new Blob([JSON.stringify(raw, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloader = document.createElement('a');
    downloader.href = url;
    downloader.download = this.reportView.fileName || 'report.json';
    downloader.click();
    setTimeout(() => URL.revokeObjectURL(url));
  }

  copyRawJson(): void {
    if (!this.reportView.rawJson) {
      return;
    }
    navigator.clipboard?.writeText(this.reportView.rawJson).then(() => {
      this.copyStatus = 'Copied';
      setTimeout(() => this.copyStatus = '', 1800);
    }).catch(() => {
      this.copyStatus = 'Copy unavailable';
      setTimeout(() => this.copyStatus = '', 1800);
    });
  }

  setChartMetric(metric: ChartMetric): void {
    this.chartMetric = metric;
    this.updateChart();
  }

  setChartRange(range: ChartRange): void {
    this.chartRange = range;
    this.updateChart();
  }

  setActiveNav(label: string): void {
    this.activeNav = label;
    const target = label === 'Overview' ? 'overview' : label.toLowerCase().replace(' ', '-');
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    this.updateChart();
  }

  get filteredEndpoints(): EndpointRow[] {
    const query = this.endpointSearch.trim().toLowerCase();
    return this.reportView.endpoints
      .filter((row) => !query || row.endpoint.toLowerCase().includes(query))
      .filter((row) => this.statusFilter === 'all' || row.status === this.statusFilter)
      .sort((a, b) => {
        const left = a[this.endpointSort];
        const right = b[this.endpointSort];
        return (typeof right === 'number' ? right : -1) - (typeof left === 'number' ? left : -1);
      });
  }

  sortEndpoints(column: keyof EndpointRow): void {
    this.endpointSort = column;
  }

  formatNumber(value?: number, maximumFractionDigits = 0): string {
    if (value === undefined || !Number.isFinite(value)) {
      return 'N/A';
    }
    return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
  }

  formatCompact(value?: number): string {
    if (value === undefined || !Number.isFinite(value)) {
      return 'N/A';
    }
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
  }

  formatPercent(value?: number, digits = 2): string {
    if (value === undefined || !Number.isFinite(value)) {
      return 'N/A';
    }
    return `${value.toFixed(digits)}%`;
  }

  formatMs(value?: number): string {
    return value === undefined ? 'N/A' : `${this.formatNumber(value, 1)} ms`;
  }

  formatDuration(seconds?: number): string {
    if (seconds === undefined || !Number.isFinite(seconds)) {
      return 'N/A';
    }
    const rounded = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(rounded / 60);
    const remainder = rounded % 60;
    return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
  }

  formatDate(value?: Date): string {
    return value ? new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(value) : 'N/A';
  }

  toneLabel(tone: StatusTone): string {
    return tone === 'healthy' ? 'Healthy' : tone === 'warning' ? 'Warning' : tone === 'critical' ? 'Critical' : 'N/A';
  }

  rawMatchesSearch(): boolean {
    return !this.rawSearch.trim() || this.reportView.rawJson.toLowerCase().includes(this.rawSearch.trim().toLowerCase());
  }

  private loadSource(source: unknown, fileName: string): void {
    const parsed = parseArtilleryReport(source);
    const state = new ReportState();
    state.report = {
      name: fileName,
      version: parsed.version,
      results: parsed.payload,
      rawResults: parsed.raw,
    };
    state.isLoaded = true;
    state.hasCustomReportMetrics = parsed.hasCustomMetrics;
    this.reportState = state;
    this.reportView = this.buildView(parsed.payload, parsed.raw, fileName);
    this.errorMessage = '';
    this.updateChart();
  }

  private buildView(payload: ReportPayload, raw: JsonRecord, fileName: string): DashboardView {
    const aggregate = payload.aggregate;
    const rawAggregate = asRecord(raw['aggregate']);
    const counters = numberMap(rawAggregate?.['counters']) ?? numberMap(aggregate?.counters) ?? {};
    const rates = numberMap(rawAggregate?.['rates']) ?? numberMap(aggregate?.rates) ?? {};
    const summaries = asRecord(rawAggregate?.['summaries']) || aggregate?.summaries as JsonRecord | undefined;
    const requests = firstNumber(counters, ['http.responses', 'http.requests', 'engine.http.responses']) ?? positive(aggregate?.requestsCompleted);
    const throughput = firstNumber(rates, ['http.request_rate', 'http.response_rate', 'engine.http.response_rate']) ?? positive(aggregate?.rps?.mean);
    const latency = this.readLatency(aggregate, summaries);
    const codes = numberMap(aggregate?.codes) ?? {};
    const errors = numberMap(aggregate?.errors) ?? {};
    const statusCounts = this.getStatusCounts(codes);
    const httpFailures = statusCounts.client + statusCounts.server;
    const runtimeErrors = sum(Object.values(errors));
    const errorCount = requests !== undefined ? runtimeErrors + httpFailures : undefined;
    const errorRate = requests && errorCount !== undefined ? (errorCount / requests) * 100 : undefined;
    const duration = this.readDuration(rawAggregate, payload.intermediate);
    const scoreParts = this.scoreParts(throughput, latency?.p95, errorRate);
    const healthScore = scoreParts.length ? Math.round(scoreParts.reduce((total, part) => total + (part.value ?? 0), 0) / scoreParts.length) : undefined;
    const status = errorRate === undefined ? 'neutral' : errorRate === 0 ? 'healthy' : errorRate < 1 ? 'warning' : 'critical';
    const endpoints = this.endpointRows(summaries, counters, codes, requests, duration);
    const errorRows = Object.entries(errors).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, count]) => ({
      name: name.replace(/_/g, ' '), count, endpoint: this.endpointForError(name),
    }));
    const metrics = this.metricCards(requests, throughput, errorRate, latency, duration, payload.intermediate, status);
    const rawJson = JSON.stringify(raw, null, 2);

    return {
      fileName,
      timestamp: aggregate?.timestamp,
      duration,
      requests,
      throughput,
      errorCount,
      errorRate,
      failedRequests: httpFailures || runtimeErrors || undefined,
      p95: latency?.p95,
      p99: latency?.p99,
      latency,
      status,
      statusLabel: status === 'healthy' ? 'PASSED' : status === 'neutral' ? 'INCOMPLETE' : 'FAILED',
      healthScore,
      healthLabel: healthScore === undefined ? 'N/A' : healthScore >= 90 ? 'EXCELLENT' : healthScore >= 75 ? 'GOOD' : 'NEEDS REVIEW',
      scoreParts,
      insight: this.insight(endpoints, errorRate, latency),
      metrics,
      endpoints,
      scenarios: this.scenarioRows(counters, payload.intermediate),
      errors: errorRows,
      codes: Object.entries(codes).sort(([a], [b]) => a.localeCompare(b)).map(([code, count]) => ({
        code, count, percentage: requests ? (count / requests) * 100 : 0, tone: this.codeTone(code),
      })),
      statusCounts,
      latencyPercentiles: [
        { label: 'P50', value: latency?.p50 }, { label: 'P75', value: latency?.p75 },
        { label: 'P90', value: latency?.p90 }, { label: 'P95', value: latency?.p95, emphasis: true },
        { label: 'P99', value: latency?.p99, emphasis: true },
      ],
      raw,
      rawJson,
      hasTimeline: (payload.intermediate?.length ?? 0) > 0,
    };
  }

  private metricCards(requests: number | undefined, throughput: number | undefined, errorRate: number | undefined, latency: ReportItem['latency'] | undefined, duration: number | undefined, intermediate: ReportItem[] | undefined, overallStatus: StatusTone): MetricCard[] {
    const bars = this.sparkline(intermediate, 'requests');
    return [
      { label: 'Requests', value: this.formatCompact(requests), detail: 'Completed responses', trend: 'No baseline', tone: overallStatus, bars },
      { label: 'Throughput', value: throughput === undefined ? 'N/A' : this.formatNumber(throughput, 1), detail: 'Requests per second', trend: 'No baseline', tone: throughput === undefined ? 'neutral' : 'healthy', target: 'Observed rate', progress: throughput === undefined ? undefined : Math.min(100, throughput / 10), bars: this.sparkline(intermediate, 'rps') },
      { label: 'Error rate', value: this.formatPercent(errorRate), detail: 'Runtime and HTTP failures', trend: 'No baseline', tone: errorRate === undefined ? 'neutral' : errorRate === 0 ? 'healthy' : errorRate < 1 ? 'warning' : 'critical', target: 'Target < 1%', progress: errorRate === undefined ? undefined : Math.max(0, 100 - Math.min(100, errorRate * 10)), bars: this.sparkline(intermediate, 'errors') },
      { label: 'P95 latency', value: this.formatMs(latency?.p95), detail: '95th percentile response', trend: 'No baseline', tone: this.latencyTone(latency?.p95), target: 'Target < 500 ms', progress: latency?.p95 === undefined ? undefined : Math.max(0, 100 - (latency.p95 / 500) * 100), bars: this.sparkline(intermediate, 'p95') },
      { label: 'P99 latency', value: this.formatMs(latency?.p99), detail: 'Tail response time', trend: 'No baseline', tone: this.latencyTone(latency?.p99, true), target: 'Target < 1,000 ms', progress: latency?.p99 === undefined ? undefined : Math.max(0, 100 - (latency.p99 / 1000) * 100), bars: this.sparkline(intermediate, 'p99') },
      { label: 'Test duration', value: this.formatDuration(duration), detail: 'Observed run window', trend: '100% parsed', tone: duration === undefined ? 'neutral' : 'healthy', target: 'Raw timeline available', progress: duration === undefined ? undefined : 100, bars: this.sparkline(intermediate, 'requests') },
    ];
  }

  private endpointRows(summaries: JsonRecord | undefined, counters: Record<string, number> | undefined, codes: Record<string, number>, totalRequests?: number, duration?: number): EndpointRow[] {
    const endpointNames = new Set<string>();
    Object.keys(summaries ?? {}).forEach((key) => {
      const marker = 'plugins.metrics-by-endpoint.response_time.';
      if (key.startsWith(marker)) endpointNames.add(key.slice(marker.length));
    });
    Object.keys(counters ?? {}).forEach((key) => {
      const marker = 'plugins.metrics-by-endpoint.';
      if (key.startsWith(marker)) endpointNames.add(key.slice(marker.length).split('.codes.')[0]);
    });

    return [...endpointNames].map((endpoint) => {
      const summary = asRecord(summaries?.[`plugins.metrics-by-endpoint.response_time.${endpoint}`]);
      const endpointCodes = Object.entries(counters ?? {}).filter(([key]) => key.startsWith(`plugins.metrics-by-endpoint.${endpoint}.codes.`)).reduce((result, [key, value]) => {
        const code = key.split('.codes.')[1];
        result[code] = value;
        return result;
      }, {} as Record<string, number>);
      const requests = numberValue(summary?.['count']) ?? (sum(Object.values(endpointCodes)) || undefined);
      const failed = Object.entries(endpointCodes).filter(([code]) => Number(code) >= 400).reduce((total, [, value]) => total + value, 0);
      const errorRate = requests ? failed / requests * 100 : undefined;
      return {
        endpoint: endpoint.startsWith('/') ? endpoint : `/${endpoint}`,
        method: 'N/A', requests, rps: requests && duration ? requests / duration : undefined,
        avg: numberValue(summary?.['mean']), p50: numberValue(summary?.['p50']), p95: numberValue(summary?.['p95']), p99: numberValue(summary?.['p99']),
        errorRate, status: (errorRate === undefined ? 'neutral' : errorRate === 0 ? 'healthy' : errorRate < 1 ? 'warning' : 'critical') as StatusTone,
      };
    }).sort((a, b) => (b.p99 ?? -1) - (a.p99 ?? -1));
  }

  private scenarioRows(counters: Record<string, number> | undefined, intermediate: ReportItem[] | undefined): ScenarioRow[] {
    return Object.entries(counters ?? {}).filter(([key]) => key.startsWith('vusers.created_by_name.')).map(([key, requests]) => ({
      name: key.replace('vusers.created_by_name.', ''), requests, rps: undefined, p95: undefined, p99: undefined, errors: undefined, status: 'neutral' as StatusTone,
    })).sort((a, b) => (b.requests ?? 0) - (a.requests ?? 0)).slice(0, 6);
  }

  private getStatusCounts(codes: Record<string, number>): { success: number; redirects: number; client: number; server: number } {
    return Object.entries(codes).reduce((result, [code, count]) => {
      const numericCode = Number(code);
      if (numericCode >= 500) result.server += count;
      else if (numericCode >= 400) result.client += count;
      else if (numericCode >= 300) result.redirects += count;
      else if (numericCode >= 200) result.success += count;
      return result;
    }, { success: 0, redirects: 0, client: 0, server: 0 });
  }

  private scoreParts(throughput?: number, p95?: number, errorRate?: number): Array<{ label: string; value?: number }> {
    return [
      { label: 'Latency', value: p95 === undefined ? undefined : Math.max(0, Math.round(100 - (p95 / 500) * 100)) },
      { label: 'Reliability', value: errorRate === undefined ? undefined : Math.max(0, Math.round(100 - Math.min(100, errorRate * 10))) },
      { label: 'Throughput', value: throughput === undefined ? undefined : Math.min(100, Math.round(throughput / 10)) },
      { label: 'Stability', value: errorRate === undefined ? undefined : Math.max(0, Math.round(100 - Math.min(100, errorRate * 10))) },
    ];
  }

  private insight(endpoints: EndpointRow[], errorRate?: number, latency?: ReportItem['latency']): string {
    const slowest = endpoints[0];
    if (slowest?.p99 !== undefined && latency?.p99 !== undefined && slowest.p99 > latency.p99 * 1.5) {
      return `${slowest.endpoint} is the clearest tail-latency outlier. Investigate this endpoint before increasing load.`;
    }
    if (errorRate !== undefined && errorRate > 1) {
      return 'Reliability needs attention. Runtime or HTTP failures are above the 1% investigation threshold.';
    }
    if (latency?.p95 !== undefined) {
      return 'Latency is available for this run. Use endpoint details and the timeline to isolate regressions.';
    }
    return 'Upload a report with aggregate latency, error, or throughput metrics to calculate health.';
  }

  private readLatency(aggregate: ReportItem | undefined, summaries: JsonRecord | undefined): ReportItem['latency'] | undefined {
    const source = asRecord(summaries?.['http.response_time']);
    if (!source && !aggregate?.latency) return undefined;
    const latency = aggregate?.latency;
    return {
      min: numberValue(source?.['min']) ?? positive(latency?.min),
      max: numberValue(source?.['max']) ?? positive(latency?.max),
      median: numberValue(source?.['median']) ?? positive(latency?.median),
      p50: numberValue(source?.['p50']) ?? positive(latency?.p50),
      p75: numberValue(source?.['p75']),
      p90: numberValue(source?.['p90']),
      p95: numberValue(source?.['p95']) ?? positive(latency?.p95),
      p99: numberValue(source?.['p99']) ?? positive(latency?.p99),
    };
  }

  private readDuration(rawAggregate: JsonRecord | undefined, intermediate?: ReportItem[]): number | undefined {
    const first = numberValue(rawAggregate?.['firstMetricAt']);
    const last = numberValue(rawAggregate?.['lastMetricAt']);
    if (first !== undefined && last !== undefined && last >= first) return (last - first) / 1000;
    const timestamps = (intermediate ?? []).map((item) => item.timestamp?.getTime()).filter((time): time is number => time !== undefined);
    return timestamps.length > 1 ? (Math.max(...timestamps) - Math.min(...timestamps)) / 1000 : undefined;
  }

  private sparkline(intermediate: ReportItem[] | undefined, kind: 'requests' | 'rps' | 'errors' | 'p95' | 'p99'): number[] {
    const values = (intermediate ?? []).slice(-18).map((item) => {
      if (kind === 'requests') return item.requestsCompleted ?? 0;
      if (kind === 'rps') return item.rps?.mean ?? 0;
      if (kind === 'errors') return sum(Object.values(numberMap(item.errors) ?? {})) || 0;
      return kind === 'p95' ? item.latency?.p95 ?? 0 : item.latency?.p99 ?? 0;
    });
    const max = Math.max(...values, 1);
    return values.length ? values.map((value) => Math.max(8, Math.round((value / max) * 100))) : [18, 35, 28, 48, 42, 62, 58];
  }

  private updateChart(): void {
    const intermediate = this.reportState.report?.results?.intermediate ?? [];
    const entries = intermediate.slice(this.chartRange === 'all' ? 0 : this.rangeStart(intermediate.length));
    const labels = entries.map((item) => item.timestamp ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(item.timestamp) : 'N/A');
    const text = this.isDarkMode ? '#a6b7ca' : '#65758b';
    const grid = this.isDarkMode ? '#2d425b' : '#dce4ec';
    const base = { type: 'line', smooth: true, showSymbol: false, lineStyle: { width: 2 }, emphasis: { focus: 'series' } } as const;
    const series = this.chartMetric === 'latency' ? [
      { ...base, name: 'P50', data: entries.map((item) => item.latency?.p50), lineStyle: { color: '#087f91', width: 2 } },
      { ...base, name: 'P95', data: entries.map((item) => item.latency?.p95), lineStyle: { color: '#d88a27', width: 2 } },
      { ...base, name: 'P99', data: entries.map((item) => item.latency?.p99), lineStyle: { color: '#b4473d', width: 2 } },
    ] : this.chartMetric === 'throughput' ? [
      { ...base, name: 'Requests/sec', data: entries.map((item) => item.rps?.mean), areaStyle: { color: 'rgba(8,127,145,0.12)' }, lineStyle: { color: '#087f91', width: 2 } },
    ] : [
      { ...base, name: 'Runtime errors', data: entries.map((item) => sum(Object.values(numberMap(item.errors) ?? {})) || null), areaStyle: { color: 'rgba(180,71,61,0.12)' }, lineStyle: { color: '#b4473d', width: 2 } },
    ];
    this.chartOptions = {
      animation: false,
      color: ['#087f91', '#d88a27', '#b4473d'],
      tooltip: { trigger: 'axis' },
      legend: { top: 0, left: 0, textStyle: { color: text } },
      grid: { left: 12, right: 18, top: 40, bottom: 24, containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: labels, axisLabel: { color: text, hideOverlap: true }, axisLine: { lineStyle: { color: grid } } },
      yAxis: { type: 'value', axisLabel: { color: text }, splitLine: { lineStyle: { color: grid } } },
      series,
    } as EChartsOption;
  }

  private rangeStart(length: number): number {
    const points = this.chartRange === '1m' ? 12 : this.chartRange === '5m' ? 60 : 180;
    return Math.max(0, length - points);
  }

  private codeTone(code: string): StatusTone {
    return Number(code) >= 500 ? 'critical' : Number(code) >= 400 ? 'warning' : 'healthy';
  }

  private latencyTone(value?: number, tail = false): StatusTone {
    if (value === undefined) return 'neutral';
    return value > (tail ? 1000 : 500) ? 'critical' : value > (tail ? 700 : 350) ? 'warning' : 'healthy';
  }

  private endpointForError(name: string): string | undefined {
    const match = name.match(/(\/[^\s]+)/);
    return match?.[1];
  }

  private emptyView(): DashboardView {
    return {
      fileName: 'No report loaded', status: 'neutral', statusLabel: 'WAITING', healthLabel: 'N/A', scoreParts: [], insight: 'Upload an Artillery JSON report to calculate performance health.', metrics: [], endpoints: [], scenarios: [], errors: [], codes: [], statusCounts: { success: 0, redirects: 0, client: 0, server: 0 }, latencyPercentiles: [], raw: undefined, rawJson: '', hasTimeline: false,
    };
  }
}

function asRecord(value: unknown): JsonRecord | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : undefined;
}

function numberMap(value: unknown): Record<string, number> | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(record)) {
    const value = numberValue(raw);
    if (value !== undefined) result[key] = value;
  }
  return result;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function firstNumber(values: Record<string, number> | undefined, keys: string[]): number | undefined {
  for (const key of keys) if (values?.[key] !== undefined) return values[key];
  return undefined;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function positive(value?: number): number | undefined {
  return value !== undefined && value >= 0 ? value : undefined;
}
