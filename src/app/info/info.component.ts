import { Component, Input, EventEmitter, Output } from '@angular/core';
import { ReportMetrics, ReportState } from '../model/report-state';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss']
})
export class InfoComponent {
  @Input() reportStat?: ReportMetrics;
  @Input() hasCustomMetrics: boolean = false;
  @Input() isLoaded: boolean = false;
  @Output() onDownloadButtonHit: EventEmitter<any> = new EventEmitter<any>();

  downloadJson() {
    this.onDownloadButtonHit.emit();
  }
}
