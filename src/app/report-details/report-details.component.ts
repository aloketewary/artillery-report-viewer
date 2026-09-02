import { Component, Input } from '@angular/core';
import { ReportItem } from '../model/report-item';
import { ReportState } from '../model/report-state';

interface MetricRow {
  label: string;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  p999: number;
}

interface FactRow {
  label: string;
  value: string;
}

interface InsightRow {
  label: string;
  value: string;
  note?: string;
}

interface ShareRow {
  label: string;
  count: number;
  share: string;
}

@Component({
  selector: 'app-report-details',
  templateUrl: './report-details.component.html',
  styleUrls: ['./report-details.component.scss'],
  standalone: false,
})
export class ReportDetailsComponent {
  @Input() reportState?: ReportState;

  private readonly timingDefinitions = [
    { key: 'http.dns', label: 'DNS lookup' },
    { key: 'http.tcp', label: 'TCP connection' },
    { key: 'http.tls', label: 'TLS negotiation' },
    { key: 'http.total', label: 'Total HTTP time' },
  ];

  get timingMetrics(): MetricRow[] {
    const summaries = this.record(this.aggregate?.summaries);
    return this.timingDefinitions
      .map(({ key, label }) => ({ label, summary: this.record(summaries[key]) }))
      .filter(({ summary }) => Object.keys(summary).length > 0)
      .map(({ label, summary }) => this.metricRow(label, summary));
  }

  get endpointMetrics(): MetricRow[] {
    const summaries = this.record(this.aggregate?.summaries);
    return Object.entries(summaries)
      .filter(([key]) => key.startsWith('plugins.metrics-by-endpoint.response_time.'))
      .map(([key, value]) => this.metricRow(key.replace('plugins.metrics-by-endpoint.response_time.', ''), this.record(value)));
  }

  get runFacts(): FactRow[] {
    const counters = this.record(this.aggregate?.counters);
    const facts: FactRow[] = [
      { label: 'Downloaded bytes', value: this.formatBytes(this.number(counters['http.downloaded_bytes'])) },
      { label: 'Virtual users created', value: this.formatNumber(this.number(counters['vusers.created'])) },
      { label: 'Virtual users completed', value: this.formatNumber(this.number(counters['vusers.completed'])) },
      { label: 'Virtual users failed', value: this.formatNumber(this.number(counters['vusers.failed'])) },
    ];
    const duration = this.runDurationMs;
    if (duration !== undefined) {
      facts.push({ label: 'Observed duration', value: this.formatDuration(duration) });
    }
    const start = this.runBoundary('firstMetricAt');
    const end = this.runBoundary('lastMetricAt');
    if (start) {
      facts.push({ label: 'First metric', value: start });
    }
    if (end) {
      facts.push({ label: 'Last metric', value: end });
    }
    return facts.filter(({ value }) => value !== 'Not available');
  }

  get outcomeMetrics(): InsightRow[] {
    const counters = this.record(this.aggregate?.counters);
    const created = this.number(counters['vusers.created']);
    const completed = this.number(counters['vusers.completed']);
    const failed = this.number(counters['vusers.failed']);
    const skipped = this.number(counters['vusers.skipped']);
    const totalResponses = this.statusTotal;
    const successfulResponses = Object.entries(this.statusMetrics)
      .filter(([code]) => Number(code) >= 200 && Number(code) < 300)
      .reduce((total, [, count]) => total + count, 0);
    const metrics: InsightRow[] = [];

    if (created !== undefined && completed !== undefined) {
      metrics.push({
        label: 'VUs completed',
        value: this.formatPercent(completed, created),
        note: `${this.formatNumber(completed)} of ${this.formatNumber(created)}`,
      });
    }
    if (failed !== undefined) {
      metrics.push({
        label: 'VUs failed',
        value: this.formatNumber(failed),
        note: created ? `${this.formatPercent(failed, created)} of created VUs` : undefined,
      });
    }
    if (totalResponses > 0) {
      metrics.push({
        label: 'HTTP 2xx rate',
        value: this.formatPercent(successfulResponses, totalResponses),
        note: `${this.formatNumber(successfulResponses)} of ${this.formatNumber(totalResponses)} responses`,
      });
    }
    if (skipped !== undefined && skipped > 0) {
      metrics.push({ label: 'VUs skipped', value: this.formatNumber(skipped) });
    }
    return metrics;
  }

  get statusMetrics(): Record<string, number> {
    const codes = this.record(this.aggregate?.codes);
    return Object.fromEntries(
      Object.entries(codes)
        .map(([code, value]) => [code, this.number(value) ?? 0] as const)
        .filter(([, count]) => count > 0)
        .sort(([left], [right]) => Number(left) - Number(right)),
    );
  }

  get statusRows(): ShareRow[] {
    const total = this.statusTotal;
    return Object.entries(this.statusMetrics).map(([code, count]) => ({
      label: code,
      count,
      share: this.formatPercent(count, total),
    }));
  }

  get errorRows(): ShareRow[] {
    const errors = this.record(this.aggregate?.errors);
    const total = Object.values(errors).reduce((sum: number, value: unknown) => sum + (this.number(value) ?? 0), 0);
    return Object.entries(errors)
      .map(([label, value]) => ({
        label,
        count: this.number(value) ?? 0,
        share: this.formatPercent(this.number(value) ?? 0, total),
      }))
      .filter(({ count }) => count > 0)
      .sort((left, right) => right.count - left.count);
  }

  get scenarioRows(): ShareRow[] {
    const counters = this.record(this.aggregate?.counters);
    const rows = Object.entries(counters)
      .filter(([label]) => label.startsWith('vusers.created_by_name.'))
      .map(([label, value]) => ({
        label: label.replace('vusers.created_by_name.', ''),
        count: this.number(value) ?? 0,
        share: '',
      }))
      .filter(({ count }) => count > 0)
      .sort((left, right) => right.count - left.count);
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    return rows.map((row) => ({ ...row, share: this.formatPercent(row.count, total) }));
  }

  get responseLatency(): InsightRow[] {
    const summary = this.record(this.record(this.aggregate?.summaries)['http.response_time']);
    const definitions = [
      ['Mean', 'mean'],
      ['P50', 'p50'],
      ['P95', 'p95'],
      ['P99', 'p99'],
      ['Max', 'max'],
    ];
    return definitions
      .map(([label, key]) => ({ label, value: this.number(summary[key]) }))
      .filter((metric): metric is { label: string; value: number } => metric.value !== undefined)
      .map(({ label, value }) => ({ label, value: `${this.formatNumber(value)} ms` }));
  }

  get hasDetails(): boolean {
    return this.timingMetrics.length > 0
      || this.endpointMetrics.length > 0
      || this.runFacts.length > 0
      || this.outcomeMetrics.length > 0
      || this.statusRows.length > 0
      || this.errorRows.length > 0
      || this.scenarioRows.length > 0;
  }

  private get aggregate(): ReportItem | undefined {
    return this.reportState?.report?.results?.aggregate;
  }

  private get runDurationMs(): number | undefined {
    const aggregate = this.record(this.rawAggregate);
    const first = this.number(aggregate['firstMetricAt']);
    const last = this.number(aggregate['lastMetricAt']);
    return first !== undefined && last !== undefined && last >= first ? last - first : undefined;
  }

  private get statusTotal(): number {
    return Object.values(this.statusMetrics).reduce((total, count) => total + count, 0);
  }

  private runBoundary(key: 'firstMetricAt' | 'lastMetricAt'): string | undefined {
    const timestamp = this.number(this.record(this.rawAggregate)[key]);
    return timestamp === undefined
      ? undefined
      : new Date(timestamp).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
  }

  private get rawAggregate(): unknown {
    const root = this.record(this.reportState?.report?.rawResults);
    return root['aggregate'];
  }

  private metricRow(label: string, summary: Record<string, unknown>): MetricRow {
    return {
      label,
      p50: this.number(summary['p50']) ?? this.number(summary['median']) ?? 0,
      p75: this.number(summary['p75']) ?? 0,
      p90: this.number(summary['p90']) ?? 0,
      p95: this.number(summary['p95']) ?? 0,
      p99: this.number(summary['p99']) ?? 0,
      p999: this.number(summary['p999']) ?? 0,
    };
  }

  formatNumber(value: number | undefined): string {
    return value === undefined ? 'Not available' : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }

  formatPercent(value: number, total: number): string {
    if (!total) {
      return 'Not available';
    }
    return `${((value / total) * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
  }

  formatBytes(value: number | undefined): string {
    if (value === undefined) {
      return 'Not available';
    }
    if (value < 1024) {
      return `${value.toLocaleString()} B`;
    }
    if (value < 1024 * 1024) {
      return `${(value / 1024).toFixed(1)} KB`;
    }
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatDuration(value: number): string {
    if (value < 1000) {
      return `${Math.round(value)} ms`;
    }
    return `${(value / 1000).toFixed(1)} s`;
  }

  private number(value: unknown): number | undefined {
    const result = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(result) ? result : undefined;
  }

  private record(value: unknown): Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }
}
