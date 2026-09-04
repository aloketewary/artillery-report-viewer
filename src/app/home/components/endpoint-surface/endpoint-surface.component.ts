import {Component, EventEmitter, Input, Output} from '@angular/core';
import type {DashboardView} from '../home/home.component';
import type {StatusTone, TableFilterName, TableIntent, TableSortName} from '../../presentation';

type EndpointRow = DashboardView['endpoints'][number];
type FilterOption = Readonly<{value: string; label: string}>;

type SortableEndpointColumn = Extract<TableSortName, 'endpoint' | 'requests' | 'rps' | 'p95' | 'p99' | 'errorRate'>;

@Component({
  selector: 'app-endpoint-surface',
  templateUrl: './endpoint-surface.component.html',
  styleUrls: ['./endpoint-surface.component.scss'],
  standalone: false,
})
export class EndpointSurfaceComponent {

  @Input() view: Readonly<Pick<DashboardView, 'endpoints'>> = {endpoints: []};
  @Input() title = 'Endpoint performance';
  @Input() description = 'Sort by tail latency or failure rate to find the first place to investigate.';

  private searchValue = '';
  private methodValue = 'all';
  private statusValue = 'all';
  private errorValue = 'all';
  private sortValue: TableSortName = 'priority';
  private selectedEndpointValue?: string;
  private methodOptionsSignature = '';
  private methodOptionsValue: readonly FilterOption[] = [{value: 'all', label: 'All'}];

  @Input()
  set search(value: string) {
    this.searchValue = value ?? '';
  }

  get search(): string {
    return this.searchValue;
  }

  @Input()
  set method(value: string) {
    this.methodValue = value ?? 'all';
  }

  get method(): string {
    return this.methodValue;
  }

  @Input()
  set status(value: string) {
    this.statusValue = value ?? 'all';
  }

  get status(): string {
    return this.statusValue;
  }

  @Input()
  set errors(value: string) {
    this.errorValue = value ?? 'all';
  }

  get errors(): string {
    return this.errorValue;
  }

  @Input()
  set sort(value: TableSortName) {
    this.sortValue = value ?? 'priority';
  }

  get sort(): TableSortName {
    return this.sortValue;
  }

  @Input()
  set selectedEndpoint(value: string | undefined) {
    this.selectedEndpointValue = value;
  }

  get selectedEndpoint(): string | undefined {
    return this.selectedEndpointValue;
  }

  @Output() intent = new EventEmitter<TableIntent>();

  readonly statusOptions: readonly FilterOption[] = [
    {value: 'all', label: 'All'},
    {value: 'healthy', label: 'Healthy'},
    {value: 'warning', label: 'Warning'},
    {value: 'critical', label: 'Critical'},
    {value: 'neutral', label: 'Unavailable'},
  ];

  readonly errorOptions: readonly FilterOption[] = [
    {value: 'all', label: 'All'},
    {value: 'errors', label: 'With errors'},
    {value: 'clean', label: 'No errors'},
  ];

  get endpointRows(): readonly EndpointRow[] {
    return this.view.endpoints ?? [];
  }

  get methodOptions(): readonly FilterOption[] {
    const methods = [...new Set(this.endpointRows.map((row) => row.method ?? 'N/A'))]
      .sort((left, right) => left.localeCompare(right));
    const signature = methods.join('\u0000');

    if (signature !== this.methodOptionsSignature) {
      this.methodOptionsSignature = signature;
      this.methodOptionsValue = [
        {value: 'all', label: 'All'},
        ...methods.map((value) => ({value, label: value})),
      ];
    }

    return this.methodOptionsValue;
  }

  get hasMethods(): boolean {
    return this.endpointRows.some((row) => Boolean(row.method));
  }

  get hasActiveFilters(): boolean {
    return this.search.length > 0 || this.method !== 'all' || this.status !== 'all' || this.errors !== 'all';
  }

  get filteredRows(): readonly EndpointRow[] {
    const query = this.search.trim().toLowerCase();
    const filtered = this.endpointRows
      .filter((row) => !query || row.endpoint.toLowerCase().includes(query))
      .filter((row) => this.method === 'all' || (row.method ?? 'N/A') === this.method)
      .filter((row) => this.status === 'all' || row.status === this.status)
      .filter((row) => this.errors === 'all' || (this.errors === 'errors'
        ? (row.errorRate ?? 0) > 0
        : (row.errorRate ?? 0) === 0));

    return [...filtered].sort((left, right) => this.compareRows(left, right));
  }

  get selectedRow(): EndpointRow | undefined {
    return this.endpointRows.find((row) => row.endpoint === this.selectedEndpoint);
  }

  setFilter(filter: TableFilterName, value: string): void {
    switch (filter) {
      case 'endpoint-search':
        this.searchValue = value;
        break;
      case 'method':
        this.methodValue = value;
        break;
      case 'status':
        this.statusValue = value;
        break;
      case 'errors':
        this.errorValue = value;
        break;
      default:
        return;
    }
    this.intent.emit({type: 'filter-change', payload: {filter, value}});
  }

  clearFilters(): void {
    if (!this.hasActiveFilters) {
      return;
    }

    this.setFilter('endpoint-search', '');
    this.setFilter('method', 'all');
    this.setFilter('status', 'all');
    this.setFilter('errors', 'all');
  }

  sortBy(sort: TableSortName): void {
    this.sortValue = sort;
    this.intent.emit({type: 'sort-change', payload: {sort}});
  }

  toggleEndpoint(endpoint: string): void {
    this.selectedEndpointValue = this.selectedEndpoint === endpoint ? undefined : endpoint;
    this.intent.emit({
      type: 'toggle-endpoint-detail',
      payload: {endpoint},
    });
  }

  closeDetails(): void {
    if (this.selectedEndpoint) {
      this.toggleEndpoint(this.selectedEndpoint);
    }
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

  toneLabel(tone?: StatusTone): string {
    switch (tone) {
      case 'healthy': return 'Healthy';
      case 'warning': return 'Warning';
      case 'critical': return 'Critical';
      default: return 'N/A';
    }
  }

  ariaSort(column: SortableEndpointColumn): 'ascending' | 'descending' | 'none' {
    return this.sort === column ? 'descending' : 'none';
  }

  private compareRows(left: EndpointRow, right: EndpointRow): number {
    if (this.sort === 'priority') {
      return this.comparePriority(left, right);
    }
    if (this.sort === 'endpoint') {
      return left.endpoint.localeCompare(right.endpoint);
    }

    const leftValue = this.numericSortValue(left, this.sort);
    const rightValue = this.numericSortValue(right, this.sort);
    if (leftValue !== rightValue) {
      return rightValue - leftValue;
    }
    return left.endpoint.localeCompare(right.endpoint);
  }

  private numericSortValue(row: EndpointRow, column: TableSortName): number {
    switch (column) {
      case 'requests': return row.requests ?? -1;
      case 'rps': return row.rps ?? -1;
      case 'p95': return row.p95 ?? -1;
      case 'p99': return row.p99 ?? -1;
      case 'errorRate': return row.errorRate ?? -1;
      default: return -1;
    }
  }

  private comparePriority(left: EndpointRow, right: EndpointRow): number {
    const statusRank = (status: StatusTone): number => status === 'critical'
      ? 3
      : status === 'warning' ? 2 : status === 'healthy' ? 1 : 0;
    const leftPriority = [statusRank(left.status), left.errorRate ?? -1, left.p99 ?? -1, left.p95 ?? -1];
    const rightPriority = [statusRank(right.status), right.errorRate ?? -1, right.p99 ?? -1, right.p95 ?? -1];

    for (let index = 0; index < leftPriority.length; index += 1) {
      if (leftPriority[index] !== rightPriority[index]) {
        return rightPriority[index] - leftPriority[index];
      }
    }
    return left.endpoint.localeCompare(right.endpoint);
  }
}
