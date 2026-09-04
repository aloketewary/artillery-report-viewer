import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FileUploadComponent } from '../../../file-upload/components/file-upload/file-upload.component';
import { Percentiles, PerformanceReport, TimelinePoint } from '../../../model/performance-report';
import { ReportState } from '../../../model/report-state';
import { normalizeArtilleryReport } from '../../../shared/report/performance-report-adapter';
import { ParsedReport, parseArtilleryReport } from '../../../shared/report/report-adapter';
import { ReportSessionService } from '../../../shared/report/report-session.service';
import { ThemePreferenceService } from '../../../shared/theme/theme-preference.service';
import { ReportValidationError, reportValidationMessage } from '../../../shared/report/report-validation-error';
import {
  REPORT_SECTION_NAVIGATION,
  KPI_DEFINITIONS,
  ReportAnchorId,
  HealthPresentation,
  OverviewIntent,
  PrioritySignalPresentation,
  ReportContextPresentation,
  RawDataIntent,
  RawDataPresentation,
  ShellIntent,
  ShellPresentation,
  TableIntent,
  unavailableValue,
  UploadUiState,
} from '../../presentation/presentation.contracts';
import type {KpiKey, TableSortName} from '../../presentation/presentation.contracts';

type ChartMetric = 'latency' | 'throughput' | 'errors';
type ChartRange = '1m' | '5m' | '15m' | 'all';
type StatusTone = 'healthy' | 'warning' | 'critical' | 'neutral';

export interface MetricCard {
  key: KpiKey;
  label: string;
  value: string;
  detail: string;
  trend: string;
  tone: StatusTone;
  availability: 'measured' | 'unavailable';
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

type EndpointSort = TableSortName;

interface ScenarioRow {
  name: string;
  requests?: number;
  virtualUsersCreated?: number;
  virtualUsersCompleted?: number;
  virtualUsersFailed?: number;
  virtualUsersSkipped?: number;
  rps?: number;
  p95?: number;
  p99?: number;
  errors?: number;
  errorRate?: number;
  status: StatusTone;
}

interface StatusCodeRow {
  code: string;
  label: string;
  count: number;
  percentage: number;
  tone: StatusTone;
}

interface ErrorRow {
  name: string;
  count: number;
  endpoint?: string;
  sourceKey?: string;
}

export interface DashboardView {
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
  codes: StatusCodeRow[];
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
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  reportState = new ReportState();
  errorMessage = '';
  isDarkMode = false;
  activeAnchor: ReportAnchorId = 'overview';
  chartMetric: ChartMetric = 'latency';
  chartRange: ChartRange = 'all';
  readonly chartMetricOptions: readonly ChartMetric[] = ['latency', 'throughput', 'errors'];
  readonly chartRangeOptions: readonly ChartRange[] = ['1m', '5m', '15m', 'all'];
  copyStatus = '';
  exportStatus = '';
  exportStatusRole: 'status' | 'alert' = 'status';
  rawSearch = '';
  rawDisplayText = '';
  rawDisplayStatus = '';
  rawSearchHasMatch = true;
  readonly rawDisplayLineLimit = 400;
  readonly rawSearchContextLines = 2;
  endpointSearch = '';
  methodFilter = 'all';
  statusFilter = 'all';
  errorFilter = 'all';
  scenarioSearch = '';
  selectedScenarioName?: string;
  selectedEndpointName?: string;
  selectedErrorKey?: string;
  selectedStatusCode?: string;
  endpointSort: EndpointSort = 'priority';
  readonly endpointPageSize = 200;
  endpointVisibleCount = this.endpointPageSize;
  readonly Math = Math;
  reportView: DashboardView = this.emptyView();
  uploadState: UploadUiState = {kind: 'idle'};

  @ViewChild('fileUploadComp', { static: false }) fileUploadComp?: FileUploadComponent;

  private sectionObserver?: IntersectionObserver;

  constructor(
    private readonly reportSession: ReportSessionService,
    private readonly themePreference: ThemePreferenceService,
  ) {}

  ngOnInit(): void {
    this.isDarkMode = this.themePreference.load() === 'dark';

    const session = this.reportSession.current;
    if (session) {
      this.applyLoadedReport(session.parsed, session.report, session.fileName);
    }
  }

  ngAfterViewInit(): void {
    this.observeReportSections();
  }

  ngOnDestroy(): void {
    this.sectionObserver?.disconnect();
  }

  get shellPresentation(): Readonly<ShellPresentation> {
    const hasReport = this.reportState.isLoaded;
    return {
      mode: hasReport ? 'report' : 'entry',
      theme: this.isDarkMode ? 'dark' : 'light',
      reportContext: hasReport ? this.reportContextPresentation() : undefined,
      navigation: REPORT_SECTION_NAVIGATION,
      canExport: hasReport,
      canReset: false,
    };
  }

  get rawDataPresentation(): Readonly<RawDataPresentation> {
    return {
      raw: this.reportView.raw as PerformanceReport['raw'],
      rawJson: this.reportView.rawJson,
      displayText: this.rawDisplayText,
      search: this.rawSearch,
      searchHasMatch: this.rawSearchHasMatch,
      statusMessage: this.rawDisplayStatus,
      hasData: Boolean(this.reportView.raw),
    };
  }

  onRawIntent(intent: RawDataIntent): void {
    switch (intent.type) {
      case 'toggle-raw-data':
        this.setRawDataOpen(intent.payload?.open === true);
        return;
      case 'search-raw-data':
        this.onRawSearch(intent.payload?.query ?? '');
        return;
      case 'copy-raw-data':
        this.copyRawJson();
        return;
      case 'download-raw-data':
        this.onDownloadHit();
        return;
    }
  }

  onInvestigationIntent(intent: TableIntent | OverviewIntent): void {
    if (!intent.payload) {
      return;
    }

    switch (intent.type) {
      case 'filter-change':
        switch (intent.payload.filter) {
          case 'endpoint-search':
            this.setEndpointSearch(intent.payload.value);
            return;
          case 'method':
            this.setEndpointMethodFilter(intent.payload.value);
            return;
          case 'status':
            this.setEndpointStatusFilter(intent.payload.value);
            return;
          case 'errors':
            this.setEndpointErrorFilter(intent.payload.value);
            return;
          case 'scenario-search':
            this.scenarioSearch = intent.payload.value;
            return;
        }
        return;
      case 'sort-change':
        this.endpointSort = intent.payload.sort;
        this.resetEndpointWindow();
        return;
      case 'toggle-endpoint-detail':
        this.toggleEndpoint(intent.payload.endpoint);
        return;
      case 'toggle-scenario-detail':
        this.toggleScenario(intent.payload.scenario);
        return;
      case 'toggle-error-detail': {
        const errorKey = intent.payload?.key;
        if (!errorKey) {
          return;
        }
        const error = this.reportView.errors.find((item) => (item.sourceKey ?? item.name) === errorKey);
        if (error) {
          this.toggleError(error);
        }
        return;
      }
      case 'toggle-status-detail':
        this.toggleStatusCode(intent.payload.code);
        return;
      case 'focus-raw-data':
        this.focusRawData(intent.payload.query);
        return;
      case 'open-insight':
        return;
    }
  }

  get healthPresentation(): Readonly<HealthPresentation> {
    const score = this.reportView.healthScore;
    return {
      score: score === undefined
        ? unavailableValue<number>('Calculated from available measured metrics')
        : {
          value: score,
          display: this.formatNumber(score),
          availability: 'calculated',
          context: 'Calculated from available measured metrics',
        },
      label: this.reportView.healthLabel,
      tone: this.reportView.status,
      breakdown: this.reportView.scoreParts.map((part) => ({
        label: part.label,
        value: part.value === undefined
          ? unavailableValue<number>('Calculated input unavailable')
          : {
            value: part.value,
            display: this.formatNumber(part.value),
            availability: 'calculated' as const,
            context: 'Calculated input from the report view',
          },
      })),
      explanation: this.reportView.insight,
    };
  }

  get prioritySignalPresentation(): readonly PrioritySignalPresentation[] {
    return this.reportView.errors.map((error) => ({
      name: error.name,
      count: {
        value: error.count,
        display: this.formatNumber(error.count),
        availability: 'measured' as const,
        context: 'Existing error aggregation',
      },
      endpoint: error.endpoint
        ? {
          value: error.endpoint,
          display: error.endpoint,
          availability: 'measured' as const,
          context: 'Existing affected endpoint',
        }
        : undefined,
      sourceKey: error.sourceKey,
    }));
  }

  onShellIntent(intent: ShellIntent): void {
    switch (intent.type) {
      case 'navigate':
        if (intent.payload) {
          this.navigateToAnchor(intent.payload.anchor);
        }
        return;
      case 'toggle-theme':
        this.toggleTheme();
        return;
      case 'export':
        this.exportReport();
        return;
      case 'reset':
        this.reset('shell');
        return;
    }
  }

  private reportContextPresentation(): ReportContextPresentation {
    const timestamp = this.reportView.timestamp;
    const duration = this.reportView.duration;
    return {
      fileName: {
        value: this.reportView.fileName,
        display: this.reportView.fileName,
        availability: 'measured',
      },
      startedAt: timestamp
        ? {value: timestamp, display: this.formatDate(timestamp), availability: 'measured'}
        : unavailableValue<Date>(),
      format: {
        value: 'artillery',
        display: 'Artillery JSON',
        availability: 'measured',
      },
      duration: duration === undefined
        ? unavailableValue<number>()
        : {value: duration, display: this.formatDuration(duration), availability: 'measured'},
      status: {
        value: this.reportView.status,
        display: this.toneLabel(this.reportView.status),
        availability: 'calculated',
      },
      statusLabel: this.reportView.statusLabel,
    };
  }

  private navigateToAnchor(anchor: ReportAnchorId): void {
    // Native fragment links own URL, history, keyboard activation, and scrolling.
    this.activeAnchor = anchor;
  }

  private observeReportSections(): void {
    if (typeof IntersectionObserver === 'undefined' || !this.reportState.isLoaded) {
      return;
    }

    this.sectionObserver?.disconnect();
    const visibleSections = new Map<ReportAnchorId, number>();
    this.sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const anchor = entry.target.id as ReportAnchorId;
        if (entry.isIntersecting) {
          visibleSections.set(anchor, entry.boundingClientRect.top);
        } else {
          visibleSections.delete(anchor);
        }
      });

      const nextAnchor = [...visibleSections.entries()]
        .sort((left, right) => Math.abs(left[1] - 88) - Math.abs(right[1] - 88))[0]?.[0];
      if (nextAnchor) {
        this.activeAnchor = nextAnchor;
      }
    }, {rootMargin: '-88px 0px -62% 0px', threshold: [0.1, 0.35]});

    REPORT_SECTION_NAVIGATION.forEach(({id}) => {
      const section = document.getElementById(id);
      if (section) {
        this.sectionObserver?.observe(section);
      }
    });
  }

  reset(_: string): void {
    this.reportSession.clear();
    this.setUploadState({kind: 'idle'});
    this.sectionObserver?.disconnect();
    this.sectionObserver = undefined;
    this.reportState = new ReportState();
    this.reportView = this.emptyView();
    this.activeAnchor = 'overview';
    this.errorMessage = '';
    this.exportStatus = '';
    this.exportStatusRole = 'status';
    this.rawSearch = '';
    this.rawDisplayText = '';
    this.rawDisplayStatus = '';
    this.rawSearchHasMatch = true;
    this.reportView.rawJson = '';
    this.selectedScenarioName = undefined;
    this.selectedEndpointName = undefined;
    this.selectedErrorKey = undefined;
    this.selectedStatusCode = undefined;
    this.resetEndpointWindow();
  }

  onReportUploadAndProcessed(data: ReportState): void {
    try {
      const source = data.report?.rawResults ?? data.report?.results;
      if (!source) {
        throw new ReportValidationError('missing-report-data');
      }
      this.loadSource(source, data.report?.name || 'report.json');
    } catch (error: unknown) {
      const message = reportValidationMessage(error, 'Unable to parse report.');
      this.setUploadError(error, message);
      this.onFileError(message);
    }
  }

  onUploadStateChanged(state: UploadUiState): void {
    this.uploadState = state;
  }

  onFileError(message: string): void {
    this.reportSession.clear();
    const stateBeforeReset = this.uploadState;
    this.errorMessage = message;
    this.sectionObserver?.disconnect();
    this.sectionObserver = undefined;
    this.reportState = new ReportState();
    this.reportView = this.emptyView();
    this.resetEndpointWindow();
    this.fileUploadComp?.reset(false);
    this.setUploadState(this.isRecoveryState(stateBeforeReset)
      ? stateBeforeReset
      : {kind: 'retry', message});
  }

  private setUploadError(error: unknown, message: string): void {
    if (error instanceof ReportValidationError) {
      switch (error.code) {
        case 'invalid-file-type':
          this.setUploadState({kind: 'invalid-extension', message});
          return;
        case 'invalid-json':
          this.setUploadState({kind: 'invalid-json', message});
          return;
        case 'invalid-root':
        case 'unsupported-format':
        case 'unsupported-schema':
          this.setUploadState({kind: 'unsupported-shape', message});
          return;
        default:
          break;
      }
    }
    this.setUploadState({kind: 'retry', message});
  }

  private isRecoveryState(state: UploadUiState): state is Extract<UploadUiState, {readonly message: string}> {
    return state.kind === 'invalid-extension'
      || state.kind === 'invalid-json'
      || state.kind === 'unsupported-shape'
      || state.kind === 'retry';
  }

  onDownloadHit(): void {
    if (!this.reportView.raw) {
      return;
    }

    const rawJson = this.ensureRawJson();
    if (!rawJson) {
      return;
    }

    const blob = new Blob([rawJson], { type: 'application/json' });
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

    this.exportStatusRole = 'status';
    this.exportStatus = 'Preparing report export. The HTML download will start before the print view.';
    const html = this.buildExportHtml();
    const fileName = this.exportFileName();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const downloader = document.createElement('a');
    downloader.href = url;
    downloader.download = fileName;
    downloader.click();
    setTimeout(() => URL.revokeObjectURL(url));
    this.exportStatus = `Downloaded ${fileName}. Preparing the print view.`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.exportStatusRole = 'alert';
      this.exportStatus = `Downloaded ${fileName}. Pop-up was blocked. Allow pop-ups for this site, then select Export report again to print or save a PDF.`;
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      this.exportStatus = `Downloaded ${fileName}. Print dialog opened.`;
    }, 250);
  }

  private buildExportHtml(): string {
    const view = this.reportView;
    const metricRows = KPI_DEFINITIONS.map((definition) => {
      const metric = view.metrics.find((candidate) => candidate.key === definition.key);
      return `
      <article class="metric">
        <span>${this.exportText(definition.label)}</span>
        <strong>${this.exportText(metric?.value)}</strong>
        <small>${this.exportText(metric?.detail || 'Unavailable')}</small>
        <em>${this.exportText(metric?.target || metric?.trend || 'Unavailable')}</em>
        <b class="availability">${this.exportText(metric?.availability === 'measured' ? 'Measured' : 'Unavailable')}</b>
      </article>`;
    }).join('');
    const scoreRows = view.scoreParts.map((part) => `
      <tr><th scope="row">${this.exportText(part.label)}</th><td>${this.exportText(part.value)}</td></tr>`).join('');
    const endpointRows = view.endpoints.map((row) => `
      <tr>
        <td>${this.exportText(row.endpoint)}</td><td>${this.exportText(row.method)}</td>
        <td>${this.exportText(this.formatCompact(row.requests))}</td><td>${this.exportText(this.formatNumber(row.rps, 1))}</td>
        <td>${this.exportText(this.formatMs(row.avg))}</td><td>${this.exportText(this.formatMs(row.p50))}</td>
        <td>${this.exportText(this.formatMs(row.p95))}</td><td>${this.exportText(this.formatMs(row.p99))}</td>
        <td>${this.exportText(this.formatPercent(row.errorRate))}</td><td>${this.exportText(this.toneLabel(row.status))}</td>
      </tr>`).join('');
    const statusRows = view.codes.map((code) => `
      <tr><th scope="row">${this.exportText(code.code)}</th><td>${this.exportText(code.label)}</td><td>${this.exportText(code.count)}</td><td>${this.exportText(this.formatPercent(code.percentage))}</td></tr>`).join('');
    const errorRows = view.errors.map((error) => `
      <tr><td>${this.exportText(error.name)}</td><td>${this.exportText(error.count)}</td><td>${this.exportText(error.endpoint)}</td></tr>`).join('');
    const insightRows = view.errors.map((error) => `
      <li><strong>${this.exportText(error.name)}</strong><span>${this.exportText(this.formatCompact(error.count))} occurrences${error.endpoint ? ` at ${this.exportText(error.endpoint)}` : ''}</span></li>`).join('');

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
    header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding-bottom: 24px; border-bottom: 2px solid #b7c4d1; }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 28px; letter-spacing: -0.04em; }
    h2 { margin: 28px 0 12px; font-size: 18px; letter-spacing: -0.02em; color: #152238; break-after: avoid; page-break-after: avoid; }
    h3 { margin: 20px 0 8px; font-size: 13px; color: #152238; break-after: avoid; page-break-after: avoid; }
    p, small, td, th, li { font-size: 12px; line-height: 1.5; }
    .muted, small, th, .availability { color: #4b5d73; }
    .actions { display: flex; gap: 8px; }
    button { padding: 8px 12px; color: #fff; background: #087f91; border: 0; border-radius: 5px; cursor: pointer; }
    .status { color: #126b50; font-weight: 800; letter-spacing: 0.08em; }
    .meta { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 8px; }
    .meta span { color: #4b5d73; font-size: 12px; }
    .metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .metric, .section { padding: 16px; border: 1px solid #b7c4d1; border-radius: 8px; }
    .metric { display: grid; gap: 5px; }
    .metric span, .metric em { color: #4b5d73; font-size: 11px; font-style: normal; }
    .metric strong { font-size: 22px; letter-spacing: -0.04em; }
    .availability { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #b7c4d1; }
    th { font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
    .health { display: grid; grid-template-columns: minmax(0, 1fr) 220px; gap: 24px; }
    .score { color: #087f91; font-size: 46px; font-weight: 800; letter-spacing: -0.08em; }
    .timeline { max-width: 100%; overflow-x: auto; }
    .timeline table { min-width: 760px; }
    .findings { display: grid; gap: 10px; padding: 0; margin: 0; list-style: none; }
    .findings li { display: flex; justify-content: space-between; gap: 16px; padding-bottom: 10px; border-bottom: 1px solid #b7c4d1; }
    .findings span { color: #4b5d73; }
    @media (max-width: 700px) { body { padding: 18px; } header, .health { display: block; } .actions { margin-top: 16px; } .metrics { grid-template-columns: 1fr 1fr; } .findings li { display: block; } }
    @media print {
      @page { margin: 14mm; }
      body { max-width: none; padding: 0; color: #152238; background: #fff; font-size: 10pt; }
      header { break-after: avoid; page-break-after: avoid; }
      .actions, .interactive-only, button { display: none !important; }
      h2 { margin-top: 20pt; }
      h2 + .metrics, h2 + .section { break-before: avoid; page-break-before: avoid; }
      .metrics { gap: 8pt; break-inside: avoid; page-break-inside: avoid; }
      .metric { padding: 10pt; break-inside: avoid; page-break-inside: avoid; }
      .section { padding: 10pt; border-color: #9aaabd; break-inside: auto; }
      .health { break-inside: avoid; page-break-inside: avoid; }
      .timeline { max-width: none; overflow: visible; }
      .timeline table { min-width: 0; width: 100%; table-layout: fixed; font-size: 8pt; }
      .timeline th, .timeline td { padding: 4pt 3pt; overflow-wrap: anywhere; }
      thead { display: table-header-group; }
      tr { break-inside: avoid; page-break-inside: avoid; }
      th { color: #34465c; }
      .findings li { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <p class="muted">PerfLens performance report</p>
      <h1>${this.exportText(view.fileName)}</h1>
      <div class="meta"><span>${this.exportText(this.formatDate(view.timestamp))}</span><span>Artillery JSON</span><span>${this.exportText(this.formatDuration(view.duration))}</span><span class="status">${this.exportText(view.statusLabel)}</span></div>
    </div>
    <div class="actions"><button type="button" onclick="window.print()">Print / Save PDF</button></div>
  </header>

  <h2>Summary</h2>
  <section class="metrics" aria-label="Six report KPIs">${metricRows}</section>

  <h2>Performance health</h2>
  <section class="section health">
    <div><p class="muted">Calculated health score</p><div class="score">${this.exportText(view.healthScore)} / 100</div><p>${this.exportText(view.healthLabel)}</p><p class="muted">${this.exportText(view.insight)}</p></div>
    <table><tbody>${scoreRows || '<tr><td>N/A</td></tr>'}</tbody></table>
  </section>

  <h2>Performance timeline</h2>
  <section class="section timeline"><table><thead><tr><th scope="col">Time</th><th scope="col">Requests</th><th scope="col">RPS</th><th scope="col">P50</th><th scope="col">P90</th><th scope="col">P95</th><th scope="col">P99</th><th scope="col">Error %</th></tr></thead><tbody>${this.exportTimelineRows()}</tbody></table></section>

  <h2>Endpoint performance</h2>
  <section class="section timeline"><table><thead><tr><th scope="col">Endpoint</th><th scope="col">Method</th><th scope="col">Requests</th><th scope="col">RPS</th><th scope="col">Avg</th><th scope="col">P50</th><th scope="col">P95</th><th scope="col">P99</th><th scope="col">Error %</th><th scope="col">Status</th></tr></thead><tbody>${endpointRows || '<tr><td colspan="10">No endpoint metrics available</td></tr>'}</tbody></table></section>

  <h2>Errors</h2>
  <section class="section"><p><strong>${this.exportText(view.errorCount)}</strong> total errors at <strong>${this.exportText(this.formatPercent(view.errorRate))}</strong> error rate. 4xx: ${this.exportText(this.formatCompact(view.statusCounts.client))}. 5xx: ${this.exportText(this.formatCompact(view.statusCounts.server))}.</p><h3>Status code distribution</h3><table><thead><tr><th scope="col">Code</th><th scope="col">Meaning</th><th scope="col">Count</th><th scope="col">Share</th></tr></thead><tbody>${statusRows || '<tr><td colspan="4">No status-code metrics available</td></tr>'}</tbody></table><h3>Most frequent failures</h3><table><thead><tr><th scope="col">Error</th><th scope="col">Count</th><th scope="col">Endpoint</th></tr></thead><tbody>${errorRows || '<tr><td colspan="3">No common errors</td></tr>'}</tbody></table></section>

  <h2>Insights</h2>
  <section class="section"><p>${this.exportText(view.insight)}</p>${insightRows ? `<ul class="findings" aria-label="Existing priority findings">${insightRows}</ul>` : '<p class="muted">No additional findings available.</p>'}</section>
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
    const rawJson = this.ensureRawJson();
    if (!rawJson) {
      return;
    }
    const clipboard = navigator.clipboard;
    if (!clipboard) {
      this.copyStatus = 'Copy unavailable';
      setTimeout(() => this.copyStatus = '', 1800);
      return;
    }
    clipboard.writeText(rawJson).then(() => {
      this.copyStatus = 'Copied';
      setTimeout(() => this.copyStatus = '', 1800);
    }).catch(() => {
      this.copyStatus = 'Copy unavailable';
      setTimeout(() => this.copyStatus = '', 1800);
    });
  }

  get chartMetricIndex(): number {
    return this.chartMetricOptions.indexOf(this.chartMetric);
  }

  get chartRangeIndex(): number {
    return this.chartRangeOptions.indexOf(this.chartRange);
  }

  setChartMetric(metric: ChartMetric): void {
    this.chartMetric = metric;
  }

  setChartMetricByIndex(index: number): void {
    const metric = this.chartMetricOptions[index];
    if (metric) {
      this.setChartMetric(metric);
    }
  }

  setChartRange(range: ChartRange): void {
    this.chartRange = range;
  }

  setChartRangeByIndex(index: number): void {
    const range = this.chartRangeOptions[index];
    if (range) {
      this.setChartRange(range);
    }
  }

  toggleTheme(): void {
    const nextMode = this.isDarkMode ? 'light' : 'dark';
    this.isDarkMode = nextMode === 'dark';
    this.themePreference.save(nextMode);
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

  get visibleEndpoints(): EndpointRow[] {
    return this.filteredEndpoints.slice(0, this.endpointVisibleCount);
  }

  get remainingEndpointCount(): number {
    return Math.max(0, this.filteredEndpoints.length - this.endpointVisibleCount);
  }

  showMoreEndpoints(): void {
    this.endpointVisibleCount = Math.min(
      this.endpointVisibleCount + this.endpointPageSize,
      this.filteredEndpoints.length,
    );
  }

  setEndpointSearch(value: string): void {
    this.endpointSearch = value;
    this.resetEndpointWindow();
  }

  setEndpointMethodFilter(value: string): void {
    this.methodFilter = value;
    this.resetEndpointWindow();
  }

  setEndpointStatusFilter(value: string): void {
    this.statusFilter = value;
    this.resetEndpointWindow();
  }

  setEndpointErrorFilter(value: string): void {
    this.errorFilter = value;
    this.resetEndpointWindow();
  }

  private resetEndpointWindow(): void {
    this.endpointVisibleCount = this.endpointPageSize;
  }

  get filteredScenarios(): ScenarioRow[] {
    const query = this.scenarioSearch.trim().toLowerCase();
    return this.reportView.scenarios.filter((row) => !query || row.name.toLowerCase().includes(query));
  }

  get selectedEndpoint(): EndpointRow | undefined {
    return this.reportView.endpoints.find((row) => row.endpoint === this.selectedEndpointName);
  }

  toggleEndpoint(endpoint: string): void {
    this.selectedEndpointName = this.selectedEndpointName === endpoint ? undefined : endpoint;
  }

  get selectedScenario(): ScenarioRow | undefined {
    return this.reportView.scenarios.find((row) => row.name === this.selectedScenarioName);
  }

  toggleScenario(name: string): void {
    this.selectedScenarioName = this.selectedScenarioName === name ? undefined : name;
  }

  get selectedError(): ErrorRow | undefined {
    return this.reportView.errors.find((error) => (error.sourceKey ?? error.name) === this.selectedErrorKey);
  }

  get selectedStatus(): StatusCodeRow | undefined {
    return this.reportView.codes.find((code) => code.code === this.selectedStatusCode);
  }

  toggleError(error: ErrorRow): void {
    const key = error.sourceKey ?? error.name;
    this.selectedErrorKey = this.selectedErrorKey === key ? undefined : key;
    this.selectedStatusCode = undefined;
  }

  toggleStatusCode(code: string): void {
    this.selectedStatusCode = this.selectedStatusCode === code ? undefined : code;
    this.selectedErrorKey = undefined;
  }

  focusRawData(query: string): void {
    this.rawSearch = query;
    const rawPanel = document.getElementById('raw-data') as HTMLDetailsElement | null;
    if (rawPanel) {
      rawPanel.open = true;
      this.updateRawDisplay();
      rawPanel.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
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

  endpointAriaSort(column: EndpointSort): 'ascending' | 'descending' | 'none' {
    return this.endpointSort === column ? 'descending' : 'none';
  }

  endpointSortLabel(column: EndpointSort): string {
    const labels: Record<EndpointSort, string> = {
      priority: 'Sort endpoints by priority',
      endpoint: 'Sort endpoints by endpoint name',
      requests: 'Sort endpoints by request count',
      rps: 'Sort endpoints by requests per second',
      p95: 'Sort endpoints by P95 latency',
      p99: 'Sort endpoints by P99 latency',
      errorRate: 'Sort endpoints by error rate',
    };
    return this.endpointSort === column
      ? `${labels[column]}; currently selected, descending`
      : labels[column];
  }

  sortEndpoints(column: TableSortName): void {
    this.endpointSort = column;
    this.resetEndpointWindow();
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

  onRawToggle(event: Event): void {
    const details = event.currentTarget as HTMLDetailsElement | null;
    this.setRawDataOpen(Boolean(details?.open));
  }

  private setRawDataOpen(open: boolean): void {
    if (!open) {
      this.rawDisplayText = '';
      this.rawDisplayStatus = '';
      this.rawSearchHasMatch = true;
      this.reportView.rawJson = '';
      return;
    }
    this.updateRawDisplay();
  }

  onRawSearch(query: string): void {
    this.rawSearch = query;
    this.updateRawDisplay();
  }

  rawMatchesSearch(): boolean {
    return this.rawSearchHasMatch;
  }

  private ensureRawJson(): string {
    if (!this.reportView.raw) {
      return '';
    }
    if (!this.reportView.rawJson) {
      this.reportView.rawJson = JSON.stringify(this.reportView.raw, null, 2) ?? '';
    }
    return this.reportView.rawJson;
  }

  private updateRawDisplay(): void {
    const rawJson = this.ensureRawJson();
    if (!rawJson) {
      this.rawDisplayText = '';
      this.rawDisplayStatus = 'No raw report available.';
      this.rawSearchHasMatch = false;
      return;
    }

    const lines = rawJson.split('\\n');
    const query = this.rawSearch.trim().toLowerCase();
    if (!query) {
      const visibleLines = lines.slice(0, this.rawDisplayLineLimit);
      this.rawDisplayText = visibleLines.join('\\n');
      this.rawSearchHasMatch = true;
      this.rawDisplayStatus = lines.length > this.rawDisplayLineLimit
        ? `Showing first ${this.rawDisplayLineLimit} of ${lines.length} lines. Complete report remains available through Copy JSON and Download JSON.`
        : `${lines.length} lines. Complete report remains available through Copy JSON and Download JSON.`;
      return;
    }

    const matchingLines: number[] = [];
    let matchCount = 0;
    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase();
      let offset = 0;
      while (true) {
        const match = lowerLine.indexOf(query, offset);
        if (match < 0) {
          break;
        }
        matchCount += 1;
        offset = match + query.length;
      }
      if (lowerLine.includes(query)) {
        matchingLines.push(index);
      }
    });

    this.rawSearchHasMatch = matchCount > 0;
    if (!this.rawSearchHasMatch) {
      this.rawDisplayText = '';
      this.rawDisplayStatus = 'No matching text in raw report.';
      return;
    }

    const contextLines = new Set<number>();
    matchingLines.forEach((line) => {
      for (let index = Math.max(0, line - this.rawSearchContextLines); index <= Math.min(lines.length - 1, line + this.rawSearchContextLines); index += 1) {
        contextLines.add(index);
      }
    });
    const sortedLines = [...contextLines].sort((left, right) => left - right);
    const visibleLines: string[] = [];
    let previousLine = -2;
    for (const line of sortedLines) {
      if (visibleLines.length >= this.rawDisplayLineLimit) {
        break;
      }
      if (line > previousLine + 1) {
        visibleLines.push('...');
      }
      if (visibleLines.length < this.rawDisplayLineLimit) {
        visibleLines.push(lines[line]);
      }
      previousLine = line;
    }
    this.rawDisplayText = visibleLines.join('\\n');
    this.rawDisplayStatus = `${matchCount} ${matchCount === 1 ? 'match' : 'matches'} found. Showing matching lines with context. Complete report remains available through Copy JSON and Download JSON.`;
  }

  private setUploadState(state: UploadUiState): void {
    this.uploadState = state;
  }

  private loadSource(source: unknown, fileName: string): void {
    const parsed = parseArtilleryReport(source);
    const normalized = normalizeArtilleryReport(parsed, fileName);
    this.reportSession.set({fileName, parsed, report: normalized});
    this.applyLoadedReport(parsed, normalized, fileName);
  }

  private applyLoadedReport(parsed: ParsedReport, report: PerformanceReport, fileName: string): void {
    const state = new ReportState();
    state.report = {
      name: fileName,
      version: parsed.version,
      results: parsed.payload,
      rawResults: parsed.raw,
    };
    state.isLoaded = true;
    state.hasCustomReportMetrics = parsed.hasCustomMetrics;
    this.sectionObserver?.disconnect();
    this.sectionObserver = undefined;
    this.reportState = state;
    this.reportView = this.buildView(report);
    this.activeAnchor = 'overview';
    this.selectedScenarioName = undefined;
    this.selectedEndpointName = undefined;
    this.selectedErrorKey = undefined;
    this.selectedStatusCode = undefined;
    this.resetEndpointWindow();
    this.errorMessage = '';
    this.exportStatus = '';
    this.exportStatusRole = 'status';
    this.setUploadState({kind: 'ready', fileName});
    setTimeout(() => this.observeReportSections());
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
      insight: this.insight(endpoints, errorRate, latency, report.timeline),
      metrics,
      endpoints,
      scenarios: this.scenarioRows(report.scenarios),
      errors: report.errors,
      codes: Object.entries(report.summary.statusCodes).sort(([left], [right]) => Number(left) - Number(right)).map(([code, count]) => ({
        code,
        label: this.statusCodeLabel(code),
        count,
        percentage: requests ? (count / requests) * 100 : 0,
        tone: this.codeTone(code),
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
      rawJson: '',
      hasTimeline: report.timeline.length > 0,
    };
  }

  private metricCards(requests: number | undefined, throughput: number | undefined, errorRate: number | undefined, latency: Percentiles | undefined, duration: number | undefined, timeline: TimelinePoint[], overallStatus: StatusTone): MetricCard[] {
    const bars = this.sparkline(timeline, 'requests');
    return [
      { key: 'requests', label: 'Requests', value: this.formatCompact(requests), detail: 'Completed responses', trend: 'No baseline', tone: overallStatus, availability: requests === undefined ? 'unavailable' : 'measured', bars },
      { key: 'throughput', label: 'Throughput', value: throughput === undefined ? 'N/A' : this.formatNumber(throughput, 1), detail: 'Requests per second', trend: 'No baseline', tone: throughput === undefined ? 'neutral' : 'healthy', availability: throughput === undefined ? 'unavailable' : 'measured', target: 'Observed rate', progress: throughput === undefined ? undefined : Math.min(100, throughput / 10), bars: this.sparkline(timeline, 'rps') },
      { key: 'errorRate', label: 'Error Rate', value: this.formatPercent(errorRate), detail: 'Runtime and HTTP failures', trend: 'No baseline', tone: errorRate === undefined ? 'neutral' : errorRate === 0 ? 'healthy' : errorRate < 1 ? 'warning' : 'critical', availability: errorRate === undefined ? 'unavailable' : 'measured', target: 'Target < 1%', progress: errorRate === undefined ? undefined : Math.max(0, 100 - Math.min(100, errorRate * 10)), bars: this.sparkline(timeline, 'errors') },
      { key: 'p95', label: 'P95 Latency', value: this.formatMs(latency?.p95), detail: '95th percentile response', trend: 'No baseline', tone: this.latencyTone(latency?.p95), availability: latency?.p95 === undefined ? 'unavailable' : 'measured', target: 'Target < 500 ms', progress: latency?.p95 === undefined ? undefined : Math.max(0, 100 - (latency.p95 / 500) * 100), bars: this.sparkline(timeline, 'p95') },
      { key: 'p99', label: 'P99 Latency', value: this.formatMs(latency?.p99), detail: 'Tail response time', trend: 'No baseline', tone: this.latencyTone(latency?.p99, true), availability: latency?.p99 === undefined ? 'unavailable' : 'measured', target: 'Target < 1,000 ms', progress: latency?.p99 === undefined ? undefined : Math.max(0, 100 - (latency.p99 / 1000) * 100), bars: this.sparkline(timeline, 'p99') },
      { key: 'duration', label: 'Duration', value: this.formatDuration(duration), detail: 'Observed run window', trend: '100% parsed', tone: duration === undefined ? 'neutral' : 'healthy', availability: duration === undefined ? 'unavailable' : 'measured', target: 'Raw timeline available', progress: duration === undefined ? undefined : 100, bars },
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
      requests: scenario.requests,
      virtualUsersCreated: scenario.virtualUsersCreated,
      virtualUsersCompleted: scenario.virtualUsersCompleted,
      virtualUsersFailed: scenario.virtualUsersFailed,
      virtualUsersSkipped: scenario.virtualUsersSkipped,
      rps: scenario.throughputRps,
      p95: scenario.latency?.p95,
      p99: scenario.latency?.p99,
      errors: scenario.errorCount,
      errorRate: scenario.errorRatePercent,
      status: scenario.errorCount === undefined ? 'neutral' : scenario.errorCount === 0 ? 'healthy' : 'critical',
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

  private insight(endpoints: EndpointRow[], errorRate?: number, latency?: Percentiles, timeline: TimelinePoint[] = []): string {
    const slowest = endpoints[0];
    if (slowest?.p99 !== undefined && latency?.p99 !== undefined && slowest.p99 > latency.p99 * 1.5) {
      return `${slowest.endpoint} is the clearest tail-latency outlier. Investigate this endpoint before increasing load.`;
    }
    if (errorRate !== undefined && errorRate > 1) {
      return 'Reliability needs attention. Runtime or HTTP failures are above the 1% investigation threshold.';
    }
    const degradation = this.latencyDegradation(timeline);
    if (degradation) {
      return degradation;
    }
    const peakThroughput = Math.max(...timeline.map((point) => point.throughputRps ?? 0), 0);
    if (peakThroughput > 0) {
      return `Peak throughput reached ${this.formatNumber(peakThroughput, 1)} req/s.`;
    }
    if (latency?.p95 !== undefined) {
      return 'Latency is available for this run. Use endpoint details and the timeline to isolate regressions.';
    }
    return 'Upload a report with aggregate latency, error, or throughput metrics to calculate health.';
  }

  private latencyDegradation(timeline: TimelinePoint[]): string | undefined {
    const points = timeline.filter((point) => point.latency?.p95 !== undefined);
    if (points.length < 6) {
      return undefined;
    }

    const windowSize = Math.max(2, Math.floor(points.length / 3));
    const baseline = points.slice(0, windowSize).map((point) => point.latency!.p95!);
    const final = points.slice(-windowSize).map((point) => point.latency!.p95!);
    const baselineAverage = baseline.reduce((total, value) => total + value, 0) / baseline.length;
    const finalAverage = final.reduce((total, value) => total + value, 0) / final.length;

    return baselineAverage > 0 && finalAverage > baselineAverage * 1.2 && finalAverage - baselineAverage >= 20
      ? `Latency increased during the final stage of the test, from ${this.formatNumber(baselineAverage, 1)} ms to ${this.formatNumber(finalAverage, 1)} ms average P95.`
      : undefined;
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

  private statusCodeLabel(code: string): string {
    const labels: Record<string, string> = {
      '200': 'OK', '201': 'Created', '202': 'Accepted', '204': 'No Content',
      '301': 'Moved Permanently', '302': 'Found', '304': 'Not Modified',
      '400': 'Bad Request', '401': 'Unauthorized', '403': 'Forbidden', '404': 'Not Found', '408': 'Request Timeout', '409': 'Conflict', '429': 'Too Many Requests',
      '500': 'Internal Server Error', '501': 'Not Implemented', '502': 'Bad Gateway', '503': 'Service Unavailable', '504': 'Gateway Timeout',
    };
    return labels[code] ?? 'HTTP response';
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
