import {Component, EventEmitter, Input, Output} from '@angular/core';
import type {DashboardView} from '../home/home.component';
import type {StatusTone, TableIntent} from '../../presentation';

type ScenarioRow = DashboardView['scenarios'][number];
type ScenarioSurfaceView = Readonly<Pick<DashboardView, 'scenarios'>>;

@Component({
  selector: 'app-scenario-surface',
  templateUrl: './scenario-surface.component.html',
  styleUrls: ['./scenario-surface.component.scss'],
  standalone: false,
})
export class ScenarioSurfaceComponent {
  @Input() view: ScenarioSurfaceView = {scenarios: []};

  private searchValue = '';
  private selectedScenarioValue?: string;

  @Input()
  set search(value: string) {
    this.searchValue = value ?? '';
  }

  get search(): string {
    return this.searchValue;
  }

  @Input()
  set selectedScenario(value: string | undefined) {
    this.selectedScenarioValue = value;
  }

  get selectedScenario(): string | undefined {
    return this.selectedScenarioValue;
  }

  @Output() intent = new EventEmitter<TableIntent>();

  get scenarioRows(): readonly ScenarioRow[] {
    return this.view.scenarios ?? [];
  }

  get filteredRows(): readonly ScenarioRow[] {
    const query = this.search.trim().toLowerCase();
    return this.scenarioRows.filter((row) => !query || row.name.toLowerCase().includes(query));
  }

  get selectedRow(): ScenarioRow | undefined {
    return this.scenarioRows.find((row) => row.name === this.selectedScenario);
  }

  setSearch(value: string): void {
    this.searchValue = value;
    this.intent.emit({type: 'filter-change', payload: {filter: 'scenario-search', value}});
  }

  toggleScenario(name: string): void {
    this.selectedScenarioValue = this.selectedScenario === name ? undefined : name;
    this.intent.emit({type: 'toggle-scenario-detail', payload: {scenario: name}});
  }

  closeDetails(): void {
    if (this.selectedScenario) {
      this.toggleScenario(this.selectedScenario);
    }
  }

  formatNumber(value?: number, maximumFractionDigits = 1): string {
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
    return value === undefined || !Number.isFinite(value) ? 'N/A' : `${this.formatNumber(value)} ms`;
  }

  toneLabel(tone?: StatusTone): string {
    switch (tone) {
      case 'healthy': return 'Healthy';
      case 'warning': return 'Warning';
      case 'critical': return 'Critical';
      default: return 'N/A';
    }
  }

  hasMeasuredPerformance(row: ScenarioRow): boolean {
    return [row.requests, row.rps, row.p95, row.p99, row.errors, row.errorRate]
      .some((value) => value !== undefined && Number.isFinite(value));
  }
}
