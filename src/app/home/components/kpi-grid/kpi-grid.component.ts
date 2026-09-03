import {Component, Input} from '@angular/core';
import type {MetricCard} from '../home/home.component';
import {KPI_DEFINITIONS, KPI_KEYS, type KpiKey} from '../../presentation';

@Component({
  selector: 'app-kpi-grid',
  templateUrl: './kpi-grid.component.html',
  styleUrls: ['./kpi-grid.component.scss'],
  standalone: false,
})
export class KpiGridComponent {
  @Input() metrics: readonly MetricCard[] = [];

  get orderedMetrics(): readonly MetricCard[] {
    return KPI_KEYS.map((key) => this.metrics.find((metric) => metric.key === key) ?? this.unavailableMetric(key));
  }

  private unavailableMetric(key: KpiKey): MetricCard {
    const definition = KPI_DEFINITIONS.find((candidate) => candidate.key === key);
    return {
      key,
      label: definition?.label ?? key,
      value: 'N/A',
      detail: 'Value unavailable in this report',
      trend: '',
      tone: 'neutral',
      availability: 'unavailable',
      bars: [],
    };
  }
}
