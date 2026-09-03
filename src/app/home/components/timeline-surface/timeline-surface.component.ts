import { Component, ElementRef, Input, OnChanges, Optional, SimpleChanges } from '@angular/core';
import type { EChartsOption } from 'echarts';
import type { TimelinePoint } from '../../../model/performance-report';
import type { TimelineMetric, TimelineRange } from '../../presentation/presentation.contracts';

@Component({
  selector: 'app-timeline-surface',
  templateUrl: './timeline-surface.component.html',
  styleUrls: ['./timeline-surface.component.scss'],
  standalone: false,
})
export class TimelineSurfaceComponent implements OnChanges {
  @Input() timeline: readonly TimelinePoint[] = [];
  @Input() metric: TimelineMetric = 'latency';
  @Input() range: TimelineRange = 'all';
  @Input() darkMode = false;

  readonly maxChartPoints = 240;
  chartOptions: EChartsOption = {};

  constructor(@Optional() private readonly elementRef?: ElementRef<HTMLElement>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['timeline'] || changes['metric'] || changes['range'] || changes['darkMode']) {
      this.updateChart();
    }
  }

  get hasData(): boolean {
    return this.timeline.length > 0;
  }

  get displayEntries(): readonly TimelinePoint[] {
    return this.displayTimelineEntries();
  }

  get selectedPointCount(): number {
    return this.rangedTimelineEntries().length;
  }

  get isDownsampled(): boolean {
    return this.displayEntries.length < this.selectedPointCount;
  }

  get hasMetricData(): boolean {
    return this.displayEntries.some((point) => this.metricValue(point) !== undefined);
  }

  get latestMetricValue(): number | undefined {
    return [...this.displayEntries].reverse()
      .map((point) => this.metricValue(point))
      .find((value): value is number => value !== undefined);
  }

  get latestMetricLabel(): string {
    if (this.metric === 'throughput') {
      return 'Latest rate';
    }
    if (this.metric === 'errors') {
      return 'Latest error rate';
    }

    const latestPoint = [...this.displayEntries].reverse().find((point) => this.metricValue(point) !== undefined);
    if (latestPoint?.latency?.p95 !== undefined && Number.isFinite(latestPoint.latency.p95)) {
      return 'Latest P95';
    }
    if (latestPoint?.latency?.p99 !== undefined && Number.isFinite(latestPoint.latency.p99)) {
      return 'Latest P99';
    }
    return 'Latest latency';
  }

  get chartAccessibleLabel(): string {
    return `${this.metricLabel} timeline with ${this.displayEntries.length} displayed data points.`;
  }

  get metricLabel(): string {
    return this.metric === 'latency'
      ? 'Latency'
      : this.metric === 'throughput' ? 'Throughput' : 'Error rate';
  }

  get metricDescription(): string {
    return this.metric === 'latency'
      ? 'Percentile response time'
      : this.metric === 'throughput' ? 'Completed requests per second' : 'Failed requests as a percentage';
  }

  get metricUnit(): string {
    return this.metric === 'latency'
      ? 'milliseconds'
      : this.metric === 'throughput' ? 'requests per second' : 'percent';
  }

  get rangeLabel(): string {
    return this.range === 'all' ? 'the complete timeline' : `the last ${this.range}`;
  }

  get displayWindowLabel(): string {
    const first = this.displayEntries[0]?.at;
    const last = this.displayEntries[this.displayEntries.length - 1]?.at;
    return first && last ? `${this.formatTime(first)} to ${this.formatTime(last)}` : 'Timestamp unavailable';
  }

  get pointSummary(): string {
    if (this.isDownsampled) {
      return `Showing ${this.displayEntries.length} of ${this.selectedPointCount} points in the selected window.`;
    }
    return `${this.displayEntries.length} ${this.displayEntries.length === 1 ? 'point' : 'points'} in the selected window.`;
  }

  get metricAvailabilityMessage(): string {
    return `No ${this.metricLabel.toLowerCase()} values are available in the selected window. Other measured fields remain available in the text view.`;
  }

  formatTime(value?: Date): string {
    return value
      ? new Intl.DateTimeFormat('en-GB', {hour: '2-digit', minute: '2-digit', second: '2-digit'}).format(value)
      : 'N/A';
  }

  formatNumber(value?: number, maximumFractionDigits = 0): string {
    if (value === undefined || !Number.isFinite(value)) {
      return 'N/A';
    }
    return new Intl.NumberFormat('en-US', {maximumFractionDigits}).format(value);
  }

  formatCompact(value?: number): string {
    if (value === undefined || !Number.isFinite(value)) {
      return 'N/A';
    }
    return new Intl.NumberFormat('en-US', {notation: 'compact', maximumFractionDigits: 2}).format(value);
  }

  formatPercent(value?: number): string {
    return value === undefined || !Number.isFinite(value) ? 'N/A' : `${value.toFixed(2)}%`;
  }

  formatMs(value?: number): string {
    return value === undefined || !Number.isFinite(value) ? 'N/A' : `${this.formatNumber(value, 1)} ms`;
  }

  formatMetricValue(value?: number): string {
    if (value === undefined) {
      return 'N/A';
    }
    return this.metric === 'latency'
      ? this.formatMs(value)
      : this.metric === 'throughput' ? `${this.formatNumber(value, 1)} RPS` : this.formatPercent(value);
  }

  private metricValue(point: TimelinePoint): number | undefined {
    const value = this.metric === 'latency'
      ? point.latency?.p95 ?? point.latency?.p99 ?? point.latency?.p90 ?? point.latency?.p50
      : this.metric === 'throughput' ? point.throughputRps : point.errorRatePercent;
    return value !== undefined && Number.isFinite(value) ? value : undefined;
  }

  private rangedTimelineEntries(): readonly TimelinePoint[] {
    return this.timeline.slice(
      this.range === 'all' ? 0 : this.rangeStart(this.timeline.length),
    );
  }

  private displayTimelineEntries(): readonly TimelinePoint[] {
    const source = this.rangedTimelineEntries();
    if (source.length <= this.maxChartPoints) {
      return source;
    }

    const indexes = new Set<number>([0, source.length - 1]);
    for (let position = 1; position < this.maxChartPoints - 1; position += 1) {
      indexes.add(Math.round((position / (this.maxChartPoints - 1)) * (source.length - 1)));
    }
    return [...indexes]
      .sort((left, right) => left - right)
      .map((index) => source[index]);
  }

  private updateChart(): void {
    const entries = this.displayTimelineEntries();
    if (!entries.length) {
      this.chartOptions = {animation: false, series: []};
      return;
    }

    const labels = entries.map((item) => this.formatTime(item.at));
    const text = this.themeToken('--arv-chart-text', this.darkMode ? '#a6b7ca' : '#65758b');
    const grid = this.themeToken('--arv-chart-grid', this.darkMode ? '#2d425b' : '#dce4ec');
    const palette = [
      this.themeToken('--arv-chart-series-p50', this.darkMode ? '#72d1d8' : '#087f91'),
      this.themeToken('--arv-chart-series-p90', this.darkMode ? '#86cfd3' : '#5aa7ae'),
      this.themeToken('--arv-chart-series-p95', this.darkMode ? '#e2ad69' : '#d88a27'),
      this.themeToken('--arv-chart-series-p99', this.darkMode ? '#ff9a8f' : '#b4473d'),
    ];
    const throughputArea = this.themeToken(
      '--arv-chart-area-throughput',
      this.darkMode ? 'rgba(114,209,216,0.16)' : 'rgba(8,127,145,0.12)',
    );
    const errorsArea = this.themeToken(
      '--arv-chart-area-errors',
      this.darkMode ? 'rgba(255,154,143,0.16)' : 'rgba(180,71,61,0.12)',
    );
    const tooltipBackground = this.themeToken(
      '--arv-chart-tooltip-background',
      this.darkMode ? '#142338' : '#ffffff',
    );
    const tooltipBorder = this.themeToken(
      '--arv-chart-tooltip-border',
      this.darkMode ? '#3d5570' : '#c6d2df',
    );
    const base = {
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: {width: 2},
      emphasis: {focus: 'series', lineStyle: {width: 3}},
    } as const;
    const series = this.metric === 'latency' ? [
      {...base, name: 'P50', data: entries.map((item) => item.latency?.p50), lineStyle: {color: palette[0], width: 2, opacity: 0.62}},
      {...base, name: 'P90', data: entries.map((item) => item.latency?.p90), lineStyle: {color: palette[1], width: 2, opacity: 0.74}},
      {...base, name: 'P95', data: entries.map((item) => item.latency?.p95), lineStyle: {color: palette[2], width: 2.5}},
      {...base, name: 'P99', data: entries.map((item) => item.latency?.p99), lineStyle: {color: palette[3], width: 2.5}},
    ] : this.metric === 'throughput' ? [
      {
        ...base,
        name: 'Requests/sec',
        data: entries.map((item) => item.throughputRps),
        areaStyle: {color: throughputArea},
        lineStyle: {color: palette[0], width: 2.5},
      },
    ] : [
      {
        ...base,
        name: 'Error rate',
        data: entries.map((item) => item.errorRatePercent ?? null),
        areaStyle: {color: errorsArea},
        lineStyle: {color: palette[3], width: 2.5},
      },
    ];
    const tooltipFormatter = (params: unknown): string => {
      const first = Array.isArray(params) ? params[0] : params;
      if (!first || typeof first !== 'object' || !('dataIndex' in first) || typeof first.dataIndex !== 'number') {
        return '';
      }
      const point = entries[first.dataIndex];
      if (!point) {
        return '';
      }
      return [
        `<strong>${labels[first.dataIndex]}</strong>`,
        `Requests: ${this.formatCompact(point.requestsCompleted)}`,
        `RPS: ${this.formatNumber(point.throughputRps, 1)}`,
        `P50: ${this.formatMs(point.latency?.p50)}`,
        `P90: ${this.formatMs(point.latency?.p90)}`,
        `P95: ${this.formatMs(point.latency?.p95)}`,
        `P99: ${this.formatMs(point.latency?.p99)}`,
        `Error rate: ${this.formatPercent(point.errorRatePercent)}`,
      ].join('<br>');
    };

    this.chartOptions = {
      // CSS media queries cannot control canvas rendering, so disable ECharts
      // animation explicitly while keeping the chart and its controls usable.
      animation: false,
      animationDuration: 0,
      animationDurationUpdate: 0,
      animationDelay: 0,
      animationDelayUpdate: 0,
      backgroundColor: 'transparent',
      color: palette,
      tooltip: {
        trigger: 'axis',
        formatter: tooltipFormatter,
        confine: true,
        padding: [10, 12],
        backgroundColor: tooltipBackground,
        borderColor: tooltipBorder,
        borderWidth: 1,
        axisPointer: {type: 'line', lineStyle: {color: grid, width: 1}},
        textStyle: {color: this.themeToken('--arv-code-text', this.darkMode ? '#e8f0f7' : '#152238')},
      },
      legend: {top: 0, left: 0, itemWidth: 14, itemHeight: 3, textStyle: {color: text}},
      grid: {left: 12, right: 18, top: 42, bottom: 38, containLabel: true},
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: labels,
        axisLabel: {color: text, fontSize: 10, hideOverlap: true},
        axisLine: {lineStyle: {color: grid}},
      },
      yAxis: {
        type: 'value',
        name: this.metricUnit,
        nameTextStyle: {color: text},
        axisLabel: {
          color: text,
          fontSize: 10,
          formatter: (value: string | number) => `${value}${this.metric === 'latency' ? ' ms' : this.metric === 'throughput' ? ' RPS' : '%'}`,
        },
        splitLine: {lineStyle: {color: grid}},
      },
      series,
    } as EChartsOption;
  }

  private themeToken(name: string, fallback: string): string {
    const element = this.elementRef?.nativeElement;
    if (!element || typeof getComputedStyle !== 'function') {
      return fallback;
    }

    return getComputedStyle(element).getPropertyValue(name).trim() || fallback;
  }

  private rangeStart(length: number): number {
    const points = this.range === '1m' ? 12 : this.range === '5m' ? 60 : 180;
    return Math.max(0, length - points);
  }
}
