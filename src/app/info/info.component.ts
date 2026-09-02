import { Component, Input, EventEmitter, Output, ChangeDetectionStrategy } from '@angular/core';
import { ReportMetrics, ReportState } from '../model/report-state';

@Component({
    selector: 'app-info',
    templateUrl: './info.component.html',
    styleUrls: ['./info.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class InfoComponent {
  @Input() reportStat?: ReportMetrics;
  @Input() hasCustomMetrics: boolean = false;
  @Input() isLoaded: boolean = false;
  @Output() onDownloadButtonHit = new EventEmitter<void>();

  downloadJson(): void {
    this.onDownloadButtonHit.emit();
  }
}
