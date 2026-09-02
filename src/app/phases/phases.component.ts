import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { ReportMetrics } from '../model/report-state';

@Component({
    selector: 'app-phases',
    templateUrl: './phases.component.html',
    styleUrls: ['./phases.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class PhasesComponent {
  @Input() reportStat?: ReportMetrics;
  @Input() isLoaded: boolean = false;

  constructor() {
  }
}
