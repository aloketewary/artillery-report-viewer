import {Component, EventEmitter, Input, Output} from '@angular/core';
import type {DashboardView} from '../home/home.component';
import {
  OverviewIntent,
  StatusCodeTableRow,
  StatusTone,
  TableIntent,
  unavailableValue,
} from '../../presentation';
import type {ErrorTableRow, PresentationValue} from '../../presentation';

export type ErrorSurfaceIntent = TableIntent | OverviewIntent;

type ErrorSurfaceView = Readonly<Pick<DashboardView, 'errorCount' | 'errorRate' | 'requests' | 'statusCounts' | 'codes' | 'errors'>>;

interface StatusGroupPresentation {
  readonly key: '2xx' | '3xx' | '4xx' | '5xx';
  readonly label: string;
  readonly count: PresentationValue<number>;
  readonly tone: StatusTone;
}

@Component({
  selector: 'app-error-surface',
  templateUrl: './error-surface.component.html',
  styleUrls: ['./error-surface.component.scss'],
  standalone: false,
})
export class ErrorSurfaceComponent {
  @Input() view: ErrorSurfaceView = {
    errorCount: undefined,
    errorRate: undefined,
    requests: undefined,
    statusCounts: {success: 0, redirects: 0, client: 0, server: 0},
    codes: [],
    errors: [],
  };

  private selectedErrorKeyValue?: string;
  private selectedStatusCodeValue?: string;

  @Input()
  set selectedErrorKey(value: string | undefined) {
    this.selectedErrorKeyValue = value;
  }

  get selectedErrorKey(): string | undefined {
    return this.selectedErrorKeyValue;
  }

  @Input()
  set selectedStatusCode(value: string | undefined) {
    this.selectedStatusCodeValue = value;
  }

  get selectedStatusCode(): string | undefined {
    return this.selectedStatusCodeValue;
  }

  @Output() intent = new EventEmitter<ErrorSurfaceIntent>();

  get totalErrors(): PresentationValue<number> {
    return this.numberValue(this.view.errorCount, 'Measured total error count');
  }

  get errorRate(): PresentationValue<number> {
    return this.numberValue(this.view.errorRate, 'Measured aggregate error rate', 2);
  }

  get statusGroups(): readonly StatusGroupPresentation[] {
    return [
      {key: '2xx', label: 'Successful responses', count: this.numberValue(this.view.statusCounts.success, 'Measured 2xx response count'), tone: 'healthy'},
      {key: '3xx', label: 'Redirect responses', count: this.numberValue(this.view.statusCounts.redirects, 'Measured 3xx response count'), tone: 'neutral'},
      {key: '4xx', label: 'Client errors', count: this.numberValue(this.view.statusCounts.client, 'Measured 4xx response count'), tone: 'warning'},
      {key: '5xx', label: 'Server errors', count: this.numberValue(this.view.statusCounts.server, 'Measured 5xx response count'), tone: 'critical'},
    ];
  }

  get statusRows(): readonly StatusCodeTableRow[] {
    return this.view.codes.map((code) => ({
      code: code.code,
      label: code.label,
      count: this.numberValue(code.count, 'Measured status-code count'),
      percentage: this.numberValue(code.percentage, 'Measured share of recorded requests', 2),
      tone: code.tone,
    }));
  }

  get failureRows(): readonly ErrorTableRow[] {
    return this.view.errors.map((error) => ({
      name: error.name,
      count: this.numberValue(error.count, 'Measured failure count'),
      endpoint: error.endpoint
        ? {
          value: error.endpoint,
          display: error.endpoint,
          availability: 'measured' as const,
          context: 'Measured affected route',
        }
        : undefined,
      sourceKey: error.sourceKey,
    }));
  }

  get hasRecordedFailures(): boolean {
    return this.failureRows.length > 0;
  }

  get selectedStatus(): StatusCodeTableRow | undefined {
    return this.statusRows.find((status) => status.code === this.selectedStatusCode);
  }

  get selectedError(): ErrorTableRow | undefined {
    return this.failureRows.find((error) => (error.sourceKey ?? error.name) === this.selectedErrorKey);
  }

  statusBarWidth(count: PresentationValue<number>): number {
    const requests = this.view.requests;
    if (count.availability === 'unavailable' || requests === undefined || !Number.isFinite(requests) || requests <= 0) {
      return 0;
    }
    return Math.min(100, Math.max(0, (count.value / requests) * 100));
  }

  statusBarLabel(group: StatusGroupPresentation): string {
    const percentage = this.statusBarPercentage(group.count);
    return `${group.key}: ${group.count.display}${percentage === 'N/A' ? '' : `, ${percentage}`}`;
  }

  statusBarPercentage(count: PresentationValue<number>): string {
    const requests = this.view.requests;
    if (count.availability === 'unavailable' || requests === undefined || !Number.isFinite(requests) || requests <= 0) {
      return 'N/A';
    }
    return this.formatPercent((count.value / requests) * 100);
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

  toggleStatusCode(code: string): void {
    this.selectedStatusCodeValue = this.selectedStatusCode === code ? undefined : code;
    this.selectedErrorKeyValue = undefined;
    this.intent.emit({type: 'toggle-status-detail', payload: {code}});
  }

  toggleError(error: ErrorTableRow): void {
    const key = error.sourceKey ?? error.name;
    this.selectedErrorKeyValue = this.selectedErrorKey === key ? undefined : key;
    this.selectedStatusCodeValue = undefined;
    this.intent.emit({type: 'toggle-error-detail', payload: {key}});
  }

  focusRawData(query: string): void {
    this.intent.emit({type: 'focus-raw-data', payload: {query}});
  }

  private numberValue(value: number | undefined, context: string, maximumFractionDigits = 0): PresentationValue<number> {
    return value === undefined || !Number.isFinite(value)
      ? unavailableValue<number>(context)
      : {
        value,
        display: this.formatNumber(value, maximumFractionDigits),
        availability: 'measured',
        context,
      };
  }
}
