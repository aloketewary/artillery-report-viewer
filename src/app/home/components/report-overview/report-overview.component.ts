import {Component, Input} from '@angular/core';
import type {DashboardView} from '../home/home.component';
import type {ReportContextPresentation} from '../../presentation';

@Component({
  selector: 'app-report-overview',
  templateUrl: './report-overview.component.html',
  styleUrls: ['./report-overview.component.scss'],
  standalone: false,
})
export class ReportOverviewComponent {
  @Input() view!: Readonly<DashboardView>;
  @Input() context?: Readonly<ReportContextPresentation>;
}
