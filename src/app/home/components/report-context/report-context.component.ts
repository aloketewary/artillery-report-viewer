import {Component, Input} from '@angular/core';
import type {ReportContextPresentation} from '../../presentation';

@Component({
  selector: 'app-report-context',
  templateUrl: './report-context.component.html',
  styleUrls: ['./report-context.component.scss'],
  standalone: false,
})
export class ReportContextComponent {
  @Input() context?: Readonly<ReportContextPresentation>;
}
