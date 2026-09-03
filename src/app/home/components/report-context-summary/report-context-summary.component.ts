import {Component, Input} from '@angular/core';
import type {ReportContextPresentation} from '../../presentation';

@Component({
  selector: 'app-report-context-summary',
  templateUrl: './report-context-summary.component.html',
  styleUrls: ['./report-context-summary.component.scss'],
  standalone: false,
})
export class ReportContextSummaryComponent {
  @Input() context?: Readonly<ReportContextPresentation>;
}
