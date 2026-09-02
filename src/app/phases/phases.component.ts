import { Component, Input } from '@angular/core';
import { ReportMetrics } from '../model/report-state';

@Component({
    selector: 'app-phases',
    templateUrl: './phases.component.html',
    styleUrls: ['./phases.component.scss'],
    standalone: false
})
export class PhasesComponent {
  @Input() reportStat?: ReportMetrics;
  @Input() isLoaded: boolean = false;

  constructor() {
  }
}
