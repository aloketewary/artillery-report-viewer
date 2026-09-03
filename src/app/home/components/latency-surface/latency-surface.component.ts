import {Component, Input} from '@angular/core';
import type {Percentiles} from '../../../model/performance-report';
import {unavailableValue} from '../../presentation';
import type {PresentationValue} from '../../presentation';

export type LatencyPercentileKey = 'p50' | 'p90' | 'p95' | 'p99';

export interface LatencyPercentilePresentation {
  readonly key: LatencyPercentileKey;
  readonly label: string;
  readonly value: PresentationValue<number>;
}

const LATENCY_PERCENTILES: readonly {key: LatencyPercentileKey; label: string}[] = [
  {key: 'p50', label: 'P50'},
  {key: 'p90', label: 'P90'},
  {key: 'p95', label: 'P95'},
  {key: 'p99', label: 'P99'},
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
    return this.percentileDefinitions.map(({key, label}) => {
      const sourceValue = this.latency?.[key];
      const value = Number.isFinite(sourceValue)
        ? {
          value: sourceValue as number,
          display: this.formatNumber(sourceValue as number),
          availability: 'measured' as const,
          context: 'Measured latency percentile',
        }
        : unavailableValue<number>('Not supplied by the report');

      return {key, label, value};
    });
  }

  get hasAvailableValue(): boolean {
    return this.percentiles.some((percentile) => percentile.value.availability === 'measured');
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US', {maximumFractionDigits: 1}).format(value);
  }
}
