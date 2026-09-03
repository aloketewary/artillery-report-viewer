import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { EChartsOption } from 'echarts';
import { FileUploadComponent } from '../file-upload/file-upload.component';
import { Percentiles, PerformanceReport, TimelinePoint } from '../model/performance-report';
import { ReportState } from '../model/report-state';
import { normalizeArtilleryReport } from '../shared/report/performance-report-adapter';
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

type EndpointSort = keyof EndpointRow | 'priority';

interface ScenarioRow {
  name: string;
  virtualUsersCreated?: number;
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
  latency?: Percentiles;
  timeline: TimelinePoint[];
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

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: false,
})
export class HomeComponent implements OnInit {
  reportState = new ReportState();
  errorMessage = '';
  isLoading = true;
  isDarkMode = false;
  activeNav = 'Overview';
  chartMetric: ChartMetric = 'latency';
  chartRange: ChartRange = 'all';
  chartOptions: EChartsOption = {};
  copyStatus = '';
  rawSearch = '';
  endpointSearch = '';
  methodFilter = 'all';
  statusFilter = 'all';
  errorFilter = 'all';
  scenarioSearch = '';
  endpointSort: EndpointSort = 'priority';
  readonly Math = Math;
  reportView: DashboardView = this.emptyView();

  @ViewChild('fileUploadComp', { static: false }) fileUploadComp?: FileUploadComponent;

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.http.get<unknown>('assets/report.json').subscribe({
      next: (source) => {
        if (this.reportState.isLoaded) {
          this.isLoading = false;
          return;
        }

        try {
          this.loadSource(source, 'report.json');
        } catch (error: unknown) {
          this.onFileError(error instanceof Error ? error.message : 'Unable to load the sample report.');
        } finally {
          this.isLoading = false;
        }
      },
      error: () => {
        this.isLoading = false;
        // Upload remains available when no local fixture is present.
      },
    });
  }

  reset(_: string): void {
    this.isLoading = false;
    this.reportState = new ReportState();
    this.reportView = this.emptyView();
    this.errorMessage = '';
    this.rawSearch = '';
  }

  onReportUploadAndProcessed(data: ReportState): void {
    this.isLoading = false;
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
    this.isLoading = false;
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

  exportReport(): void {
    if (!this.reportState.isLoaded) {
      return;
    }

    const html = this.buildExportHtml();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const downloader = document.createElement('a');
    downloader.href = url;
    downloader.download = this.exportFileName();
    downloader.click();
    setTimeout(() => URL.revokeObjectURL(url));

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.errorMessage = 'HTML report downloaded. Allow pop-ups to print or save a PDF.';
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  }

  private buildExportHtml(): string {
    const view = this.reportView;
    const metricRows = view.metrics.map((metric) => `
      <article class="metric">
        <span>${this.exportText(metric.label)}</span>
        <strong>${this.exportText(metric.value)}</strong>
        <small>${this.exportText(metric.detail)}</small>
        <em>${this.exportText(metric.target || metric.trend)}</em>
      </article>`).join('');
    const scoreRows = view.scoreParts.map((part) => `
      <tr><td>${this.exportText(part.label)}</td><td>${this.exportText(part.value)}</td></tr>`).join('');
    const endpointRows = view.endpoints.map((row) => `
      <tr>
        <td>${this.exportText(row.endpoint)}</td><td>${this.exportText(row.method)}</td>
        <td>${this.exportText(this.formatCompact(row.requests))}</td><td>${this.exportText(this.formatNumber(row.rps, 1))}</td>
        <td>${this.exportText(this.formatMs(row.avg))}</td><td>${this.exportText(this.formatMs(row.p50))}</td>
        <td>${this.exportText(this.formatMs(row.p95))}</td><td>${this.exportText(this.formatMs(row.p99))}</td>
        <td>${this.exportText(this.formatPercent(row.errorRate))}</td><td>${this.exportText(this.toneLabel(row.status))}</td>
      </tr>`).join('');
    const errorRows = view.errors.map((error) => `
      <tr><td>${this.exportText(error.name)}</td><td>${this.exportText(error.count)}</td><td>${this.exportText(error.endpoint)}</td></tr>`).join('');

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PerfLens report: ${this.exportText(view.fileName)}</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #152238; background: #eef2f6; }
    * { box-sizing: border-box; }
    body { max-width: 1180px; margin: 0 auto; padding: 32px; background: #fff; }
    header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding-bottom: 24px; border-bottom: 2px solid #dce4ec; }
    h1, h2, p { margin: 0; }
    h1 { font-size: 28px; letter-spacing: -0.04em; }
    h2 { margin: 28px 0 12px; font-size: 18px; letter-spacing: -0.02em; }
    p, small, td, th { font-size: 12px; line-height: 1.5; }
    .muted, small, th { color: #65758b; }
    .actions { display: flex; gap: 8px; }
    button { padding: 8px 12px; color: #fff; background: #087f91; border: 0; border-radius: 5px; cursor: pointer; }
    .status { color: #24775b; font-weight: 800; letter-spacing: 0.08em; }
    .meta { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 8px; }
    .meta span { color: #65758b; font-size: 12px; }
    .metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .metric, .section { padding: 16px; border: 1px solid #dce4ec; border-radius: 8px; }
    .metric { display: grid; gap: 5px; }
    .metric span, .metric em { color: #65758b; font-size: 11px; font-style: normal; }
    .metric strong { font-size: 22px; letter-spacing: -0.04em; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #dce4ec; }
    th { font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
    .health { display: grid; grid-template-columns: minmax(0, 1fr) 220px; gap: 24px; }
    .score { color: #087f91; font-size: 46px; font-weight: 800; letter-spacing: -0.08em; }
    .timeline { overflow-x: auto; }
    @media (max-width: 700px) { body { padding: 18px; } header, .health { display: block; } .actions { margin-top: 16px; } .metrics { grid-template-columns: 1fr 1fr; } }
    @media print { body { max-width: none; padding: 0; } .actions { display: none; } .section, .metric { break-inside: avoid; } }
  </style>
</head>
<body>
  <header>
    <div>
      <p class="muted">PerfLens performance report</p>
      <h1>${this.exportText(view.fileName)}</h1>
      <div class="meta"><span>${this.exportText(this.formatDate(view.timestamp))}</span><span>Artillery JSON</span><span class="status">${this.exportText(view.statusLabel)}</span></div>
    </div>
    <div class="actions"><button type="button" onclick="window.print()">Print / Save PDF</button></div>
  </header>

  <h2>Summary</h2>
  <section class="metrics">${metricRows}</section>

  <h2>Performance health</h2>
  <section class="section health">
    <div><div class="score">${this.exportText(view.healthScore)} / 100</div><p>${this.exportText(view.healthLabel)}</p><p class="muted">${this.exportText(view.insight)}</p></div>
    <table><tbody>${scoreRows || '<tr><td>No score available</td></tr>'}</tbody></table>
  </section>

  <h2>Performance timeline</h2>
  <section class="section timeline"><table><thead><tr><th>Time</th><th>Requests</th><th>RPS</th><th>P50</th><th>P90</th><th>P95</th><th>P99</th><th>Error %</th></tr></thead><tbody>${this.exportTimelineRows()}</tbody></table></section>

  <h2>Endpoint performance</h2>
  <section class="section timeline"><table><thead><tr><th>Endpoint</th><th>Method</th><th>Requests</th><th>RPS</th><th>Avg</th><th>P50</th><th>P95</th><th>P99</th><th>Error %</th><th>Status</th></tr></thead><tbody>${endpointRows || '<tr><td colspan="10">No endpoint metrics available</td></tr>'}</tbody></table></section>

  <h2>Errors</h2>
  <section class="section"><table><thead><tr><th>Error</th><th>Count</th><th>Endpoint</th></tr></thead><tbody>${errorRows || '<tr><td colspan="3">No common errors</td></tr>'}</tbody></table></section>
</body>
</html>`;
  }

  private exportTimelineRows(): string {
    const entries = this.reportView.timeline;
    if (!entries.length) {
      return '<tr><td colspan="8">No time-series data available</td></tr>';
    }

    const step = Math.max(1, Math.ceil(entries.length / 120));
    return entries.filter((_, index) => index % step === 0).map((item) => `<tr><td>${this.exportText(item.at ? this.formatDate(item.at) : 'N/A')}</td><td>${this.exportText(this.formatCompact(item.requestsCompleted))}</td><td>${this.exportText(this.formatNumber(item.throughputRps, 1))}</td><td>${this.exportText(this.formatMs(item.latency?.p50))}</td><td>${this.exportText(this.formatMs(item.latency?.p90))}</td><td>${this.exportText(this.formatMs(item.latency?.p95))}</td><td>${this.exportText(this.formatMs(item.latency?.p99))}</td><td>${this.exportText(this.formatPercent(item.errorRatePercent))}</td></tr>`).join('');
  }

  private exportFileName(): string {
    const base = this.reportView.fileName.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'report';
    return `perflens-${base}-report.html`;
  }

  private exportText(value: unknown): string {
    return String(value ?? 'N/A').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  copyRawJson(): void {
    if (!this.reportView.rawJson) {
      return;
    }
    const clipboard = navigator.clipboard;
    if (!clipboard) {
      this.copyStatus = 'Copy unavailable';
      setTimeout(() => this.copyStatus = '', 1800);
      return;
    }
    clipboard.writeText(this.reportView.rawJson).then(() => {
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
      .filter((row) => this.methodFilter === 'all' || row.method === this.methodFilter)
      .filter((row) => this.statusFilter === 'all' || row.status === this.statusFilter)
      .filter((row) => this.errorFilter === 'all' || (this.errorFilter === 'errors' ? (row.errorRate ?? 0) > 0 : (row.errorRate ?? 0) === 0))
      .sort((left, right) => {
        if (this.endpointSort === 'priority') {
          return this.compareEndpointPriority(left, right);
        }
        const leftValue = left[this.endpointSort];
        const rightValue = right[this.endpointSort];
        return (typeof rightValue === 'number' ? rightValue : -1) - (typeof leftValue === 'number' ? leftValue : -1);
      });
  }

  get filteredScenarios(): ScenarioRow[] {
    const query = this.scenarioSearch.trim().toLowerCase();
    return this.reportView.scenarios.filter((row) => !query || row.name.toLowerCase().includes(query));
  }

  private compareEndpointPriority(left: EndpointRow, right: EndpointRow): number {
    const statusRank = (status: StatusTone): number => status === 'critical' ? 3 : status === 'warning' ? 2 : status === 'healthy' ? 1 : 0;
    const leftPriority = [statusRank(left.status), left.errorRate ?? -1, left.p99 ?? -1, left.p95 ?? -1];
    const rightPriority = [statusRank(right.status), right.errorRate ?? -1, right.p99 ?? -1, right.p95 ?? -1];

    for (let index = 0; index < leftPriority.length; index += 1) {
      if (leftPriority[index] !== rightPriority[index]) {
        return rightPriority[index] - leftPriority[index];
      }
    }
    return left.endpoint.localeCompare(right.endpoint);
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
    const normalized = normalizeArtilleryReport(parsed, fileName);
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
    this.reportView = this.buildView(normalized);
    this.errorMessage = '';
    this.updateChart();
  }

  private buildView(report: PerformanceReport): DashboardView {
    const requests = report.summary.requestsCompleted;
    const throughput = report.summary.throughputRps;
    const errorCount = report.summary.errorCount;
    const errorRate = report.summary.errorRatePercent;
    const latency = report.summary.latency;
    const duration = report.metadata.durationSeconds;
    const scoreParts = this.scoreParts(throughput, latency?.p95, errorRate);
    const healthScore = scoreParts.length
      ? Math.round(scoreParts.reduce((total, part) => total + (part.value ?? 0), 0) / scoreParts.length)
      : undefined;
    const status = errorRate === undefined ? 'neutral' : errorRate === 0 ? 'healthy' : errorRate < 1 ? 'warning' : 'critical';
    const endpoints = this.endpointRows(report.endpoints);
    const metrics = this.metricCards(requests, throughput, errorRate, latency, duration, report.timeline, status);
    const rawJson = JSON.stringify(report.raw, null, 2);

    return {
      fileName: report.metadata.name,
      timestamp: report.metadata.startedAt,
      duration,
      requests,
      throughput,
      errorCount,
      errorRate,
      failedRequests: report.summary.failedRequests,
      p95: latency?.p95,
      p99: latency?.p99,
      latency,
      timeline: report.timeline,
      status,
      statusLabel: status === 'healthy' ? 'PASSED' : status === 'neutral' ? 'INCOMPLETE' : 'FAILED',
      healthScore,
      healthLabel: healthScore === undefined ? 'N/A' : healthScore >= 90 ? 'EXCELLENT' : healthScore >= 75 ? 'GOOD' : 'NEEDS REVIEW',
      scoreParts,
      insight: this.insight(endpoints, errorRate, latency),
      metrics,
      endpoints,
      scenarios: this.scenarioRows(report.scenarios),
      errors: report.errors,
      codes: Object.entries(report.summary.statusCodes).sort(([a], [b]) => a.localeCompare(b)).map(([code, count]) => ({
        code, count, percentage: requests ? (count / requests) * 100 : 0, tone: this.codeTone(code),
      })),
      statusCounts: {
        success: report.summary.statusCounts.success,
        redirects: report.summary.statusCounts.redirects,
        client: report.summary.statusCounts.clientErrors,
        server: report.summary.statusCounts.serverErrors,
      },
      latencyPercentiles: [
        { label: 'P50', value: latency?.p50 }, { label: 'P75', value: latency?.p75 },
        { label: 'P90', value: latency?.p90 }, { label: 'P95', value: latency?.p95, emphasis: true },
        { label: 'P99', value: latency?.p99, emphasis: true },
      ],
      raw: report.raw,
      rawJson,
      hasTimeline: report.timeline.length > 0,
    };
  }

  private metricCards(requests: number | undefined, throughput: number | undefined, errorRate: number | undefined, latency: Percentiles | undefined, duration: number | undefined, timeline: TimelinePoint[], overallStatus: StatusTone): MetricCard[] {
    const bars = this.sparkline(timeline, 'requests');
    return [
      { label: 'Requests', value: this.formatCompact(requests), detail: 'Completed responses', trend: 'No baseline', tone: overallStatus, bars },
      { label: 'Throughput', value: throughput === undefined ? 'N/A' : this.formatNumber(throughput, 1), detail: 'Requests per second', trend: 'No baseline', tone: throughput === undefined ? 'neutral' : 'healthy', target: 'Observed rate', progress: throughput === undefined ? undefined : Math.min(100, throughput / 10), bars: this.sparkline(timeline, 'rps') },
      { label: 'Error rate', value: this.formatPercent(errorRate), detail: 'Runtime and HTTP failures', trend: 'No baseline', tone: errorRate === undefined ? 'neutral' : errorRate === 0 ? 'healthy' : errorRate < 1 ? 'warning' : 'critical', target: 'Target < 1%', progress: errorRate === undefined ? undefined : Math.max(0, 100 - Math.min(100, errorRate * 10)), bars: this.sparkline(timeline, 'errors') },
      { label: 'P95 latency', value: this.formatMs(latency?.p95), detail: '95th percentile response', trend: 'No baseline', tone: this.latencyTone(latency?.p95), target: 'Target < 500 ms', progress: latency?.p95 === undefined ? undefined : Math.max(0, 100 - (latency.p95 / 500) * 100), bars: this.sparkline(timeline, 'p95') },
      { label: 'P99 latency', value: this.formatMs(latency?.p99), detail: 'Tail response time', trend: 'No baseline', tone: this.latencyTone(latency?.p99, true), target: 'Target < 1,000 ms', progress: latency?.p99 === undefined ? undefined : Math.max(0, 100 - (latency.p99 / 1000) * 100), bars: this.sparkline(timeline, 'p99') },
      { label: 'Test duration', value: this.formatDuration(duration), detail: 'Observed run window', trend: '100% parsed', tone: duration === undefined ? 'neutral' : 'healthy', target: 'Raw timeline available', progress: duration === undefined ? undefined : 100, bars: this.sparkline(timeline, 'requests') },
    ];
  }

  private endpointRows(endpoints: PerformanceReport['endpoints']): EndpointRow[] {
    return endpoints.map((endpoint) => {
      const errorRate = endpoint.errorRatePercent;
      return {
        endpoint: endpoint.name,
        method: endpoint.method ?? 'N/A',
        requests: endpoint.requests,
        rps: endpoint.throughputRps,
        avg: endpoint.latency?.mean,
        p50: endpoint.latency?.p50,
        p95: endpoint.latency?.p95,
        p99: endpoint.latency?.p99,
        errorRate,
        status: (errorRate === undefined ? 'neutral' : errorRate === 0 ? 'healthy' : errorRate < 1 ? 'warning' : 'critical') as StatusTone,
      };
    });
  }

  private scenarioRows(scenarios: PerformanceReport['scenarios']): ScenarioRow[] {
    return scenarios.map((scenario) => ({
      name: scenario.name,
      virtualUsersCreated: scenario.virtualUsersCreated,
      rps: undefined,
      p95: undefined,
      p99: undefined,
      errors: scenario.errorCount,
      status: 'neutral' as StatusTone,
    }));
  }

  private scoreParts(throughput?: number, p95?: number, errorRate?: number): Array<{ label: string; value?: number }> {
    return [
      { label: 'Latency', value: p95 === undefined ? undefined : Math.max(0, Math.round(100 - (p95 / 500) * 100)) },
      { label: 'Reliability', value: errorRate === undefined ? undefined : Math.max(0, Math.round(100 - Math.min(100, errorRate * 10))) },
      { label: 'Throughput', value: throughput === undefined ? undefined : Math.min(100, Math.round(throughput / 10)) },
      { label: 'Stability', value: errorRate === undefined ? undefined : Math.max(0, Math.round(100 - Math.min(100, errorRate * 10))) },
    ];
  }

  private insight(endpoints: EndpointRow[], errorRate?: number, latency?: Percentiles): string {
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

  private sparkline(timeline: TimelinePoint[], kind: 'requests' | 'rps' | 'errors' | 'p95' | 'p99'): number[] {
    const values = timeline.slice(-18).map((item) => {
      if (kind === 'requests') return item.requestsCompleted ?? 0;
      if (kind === 'rps') return item.throughputRps ?? 0;
      if (kind === 'errors') return item.errorCount ?? 0;
      return kind === 'p95' ? item.latency?.p95 ?? 0 : item.latency?.p99 ?? 0;
    });
    const max = Math.max(...values, 1);
    return values.length ? values.map((value) => Math.max(8, Math.round((value / max) * 100))) : [18, 35, 28, 48, 42, 62, 58];
  }

  private updateChart(): void {
    const entries = this.reportView.timeline.slice(this.chartRange === 'all' ? 0 : this.rangeStart(this.reportView.timeline.length));
    const labels = entries.map((item) => item.at ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(item.at) : 'N/A');
    const text = this.isDarkMode ? '#a6b7ca' : '#65758b';
    const grid = this.isDarkMode ? '#2d425b' : '#dce4ec';
    const base = { type: 'line', smooth: true, showSymbol: false, lineStyle: { width: 2 }, emphasis: { focus: 'series' } } as const;
    const series = this.chartMetric === 'latency' ? [
      { ...base, name: 'P50', data: entries.map((item) => item.latency?.p50), lineStyle: { color: '#087f91', width: 2 } },
      { ...base, name: 'P95', data: entries.map((item) => item.latency?.p95), lineStyle: { color: '#d88a27', width: 2 } },
      { ...base, name: 'P99', data: entries.map((item) => item.latency?.p99), lineStyle: { color: '#b4473d', width: 2 } },
    ] : this.chartMetric === 'throughput' ? [
      { ...base, name: 'Requests/sec', data: entries.map((item) => item.throughputRps), areaStyle: { color: 'rgba(8,127,145,0.12)' }, lineStyle: { color: '#087f91', width: 2 } },
    ] : [
      { ...base, name: 'Runtime errors', data: entries.map((item) => item.errorCount ?? null), areaStyle: { color: 'rgba(180,71,61,0.12)' }, lineStyle: { color: '#b4473d', width: 2 } },
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
      fileName: 'No report loaded', status: 'neutral', statusLabel: 'WAITING', healthLabel: 'N/A', scoreParts: [], insight: 'Upload an Artillery JSON report to calculate performance health.', metrics: [], endpoints: [], scenarios: [], errors: [], codes: [], statusCounts: { success: 0, redirects: 0, client: 0, server: 0 }, latencyPercentiles: [], timeline: [], raw: undefined, rawJson: '', hasTimeline: false,
    };
  }
}
