import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { ReportMetrics } from '../../../model/report-state';
import { ReportPhase } from '../../../model/report-phase';

@Component({
    selector: 'app-phases',
    templateUrl: './phases.component.html',
    styleUrls: ['./phases.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class PhasesComponent {
  @Input() reportStat?: ReportMetrics;
  @Input() isLoaded = false;

  get phases(): ReportPhase[] {
    return this.reportStat?.results?.aggregate?.phases ?? [];
  }
}
