import { SimpleChange } from '@angular/core';
import type { EChartsOption } from 'echarts';
import type { TimelinePoint } from '../../../model/performance-report';
import { TimelineSurfaceComponent } from './timeline-surface.component';

describe('TimelineSurfaceComponent', () => {
  const timeline: TimelinePoint[] = [
    {
      at: new Date('2025-01-01T12:00:00Z'),
      requestsCompleted: 120,
      throughputRps: 12.5,
      errorRatePercent: 0.5,
      latency: {p50: 40, p90: 75, p95: 100, p99: 160},
    },
    {
      at: new Date('2025-01-01T12:00:05Z'),
      requestsCompleted: 135,
      throughputRps: 13.5,
      errorRatePercent: 1.25,
      latency: {p50: 45, p90: 80, p95: 110, p99: 175},
    },
  ];

  function createComponent(points: readonly TimelinePoint[] = timeline): TimelineSurfaceComponent {
    const component = new TimelineSurfaceComponent();
    component.timeline = points;
    component.ngOnChanges({timeline: new SimpleChange([], points, true)});
    return component;
  }

  function series(component: TimelineSurfaceComponent): readonly {name?: string; data?: readonly unknown[]}[] {
    return ((component.chartOptions as EChartsOption).series ?? []) as readonly {name?: string; data?: readonly unknown[]}[];
  }

  it('renders all latency percentile series with source values unchanged', () => {
    const component = createComponent();

    expect(series(component).map((item) => item.name)).toEqual(['P50', 'P90', 'P95', 'P99']);
    expect(series(component)[2].data).toEqual([100, 110]);
    expect(component.timeline[0].latency?.p95).toBe(100);
  });

  it('renders throughput and error-rate projections with explicit units', () => {
    const component = createComponent();

    component.metric = 'throughput';
    component.ngOnChanges({metric: new SimpleChange('latency', 'throughput', false)});
    expect(series(component).map((item) => item.name)).toEqual(['Requests/sec']);
    expect((component.chartOptions as {yAxis?: {name?: string}}).yAxis?.name).toBe('requests per second');

    component.metric = 'errors';
    component.ngOnChanges({metric: new SimpleChange('throughput', 'errors', false)});
    expect(series(component).map((item) => item.name)).toEqual(['Error rate']);
    expect(series(component)[0].data).toEqual([0.5, 1.25]);
    expect((component.chartOptions as {yAxis?: {name?: string}}).yAxis?.name).toBe('percent');
  });

  it('limits displayed points to the selected range without changing source points', () => {
    const points = Array.from({length: 80}, (_, index) => ({
      requestsCompleted: index,
      throughputRps: index,
      latency: {p95: index},
    }));
    const component = createComponent(points);
    component.range = '5m';
    component.ngOnChanges({range: new SimpleChange('all', '5m', false)});

    expect(component.displayEntries.length).toBe(60);
    expect(component.displayEntries[0].requestsCompleted).toBe(20);
    expect(component.timeline.length).toBe(80);
    expect(component.timeline[0].requestsCompleted).toBe(0);
  });

  it('includes time and report context in tooltip output', () => {
    const component = createComponent();
    const tooltip = ((component.chartOptions as {tooltip?: {formatter?: (params: unknown) => string}}).tooltip?.formatter);

    expect(tooltip).toBeDefined();
    expect(tooltip?.([{dataIndex: 0}])).toContain('Requests: 120');
    expect(tooltip?.([{dataIndex: 0}])).toContain('P95: 100 ms');
    expect(tooltip?.([{dataIndex: 0}])).toContain('Error rate: 0.50%');
  });

  it('keeps chart rendering available without animation', () => {
    const component = createComponent();
    const options = component.chartOptions as EChartsOption & {
      animation?: boolean;
      animationDuration?: number;
      animationDurationUpdate?: number;
      animationDelay?: number;
      animationDelayUpdate?: number;
    };

    expect(options.animation).toBeFalse();
    expect(options.animationDuration).toBe(0);
    expect(options.animationDurationUpdate).toBe(0);
    expect(options.animationDelay).toBe(0);
    expect(options.animationDelayUpdate).toBe(0);
    expect(component.chartAccessibleLabel).toContain('displayed data points');
  });

  it('renders no chart series and an explicit unavailable state without timeline data', () => {
    const component = createComponent([]);

    expect(component.hasData).toBeFalse();
    expect(series(component)).toEqual([]);
    expect(component.chartAccessibleLabel).toContain('0 displayed data points');
  });
});
