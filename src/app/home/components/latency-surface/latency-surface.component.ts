import {Component, Input} from '@angular/core';
import type {Percentiles} from '../../../model/performance-report';
import {unavailableValue} from '../../presentation';
import type {PresentationValue} from '../../presentation';

export type LatencyPercentileKey = 'p50' | 'p90' | 'p95' | 'p99';

export interface LatencyPercentilePresentation {
  readonly key: LatencyPercentileKey;
  readonly label: string;
  readonly meaning: string;
  readonly value: PresentationValue<number>;
}

const LATENCY_PERCENTILES: readonly {key: LatencyPercentileKey; label: string; meaning: string}[] = [
  {key: 'p50', label: 'P50', meaning: 'Typical request'},
  {key: 'p90', label: 'P90', meaning: 'Slowest 10%'},
  {key: 'p95', label: 'P95', meaning: 'Slowest 5%'},
  {key: 'p99', label: 'P99', meaning: 'Slowest 1%'},
];

@Component({
  selector: 'app-latency-surface',
  templateUrl: './latency-surface.component.html',
  styleUrls: ['./latency-surface.component.scss'],
  standalone: false,
})
export class LatencySurfaceComponent {
  @Input() latency: Readonly<Percentiles> | undefined;

  readonly percentileDefinitions = LATENCY_PERCENTILES;

  get percentiles(): readonly LatencyPercentilePresentation[] {
    return this.percentileDefinitions.map(({key, label, meaning}) => {
      const sourceValue = this.latency?.[key];
      const value = Number.isFinite(sourceValue)
        ? {
          value: sourceValue as number,
          display: this.formatNumber(sourceValue as number),
          availability: 'measured' as const,
          context: 'Measured latency percentile',
        }
        : unavailableValue<number>('Not supplied by the report');

      return {key, label, meaning, value};
    });
  }

  get tailRatio(): number | undefined {
    const p50 = this.latency?.p50;
    const p99 = this.latency?.p99;
    return Number.isFinite(p50) && Number.isFinite(p99) && p50 !== undefined && p99 !== undefined && p50 > 0 && p99 >= p50
      ? p99 / p50
      : undefined;
  }

  get tailSpread(): number | undefined {
    const p50 = this.latency?.p50;
    const p99 = this.latency?.p99;
    return Number.isFinite(p50) && Number.isFinite(p99) && p50 !== undefined && p99 !== undefined && p99 >= p50
      ? p99 - p50
      : undefined;
  }

  get hasTailInsight(): boolean {
    return this.tailRatio !== undefined && this.tailSpread !== undefined;
  }

  get tailInsightMessage(): string {
    if (!this.hasTailInsight || this.tailRatio === undefined || this.tailSpread === undefined) {
      return 'Tail comparison unavailable until both P50 and P99 are supplied.';
    }
    return `P99 is ${this.formatRatio(this.tailRatio)} of the typical request time, with ${this.formatNumber(this.tailSpread, 1)} ms between P50 and P99.`;
  }

  get hasAvailableValue(): boolean {
    return this.percentiles.some((percentile) => percentile.value.availability === 'measured');
  }

  formatNumber(value: number, maximumFractionDigits = 1): string {
    return new Intl.NumberFormat('en-US', {maximumFractionDigits}).format(value);
  }

  formatRatio(value: number): string {
    return `${value.toFixed(1)}x`;
  }
}
