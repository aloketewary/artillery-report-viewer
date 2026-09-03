import {Component, EventEmitter, Input, Output} from '@angular/core';
import type {ShellIntent, ShellPresentation} from '../../presentation';

@Component({
  selector: 'app-report-app-bar',
  templateUrl: './report-app-bar.component.html',
  styleUrls: ['./report-app-bar.component.scss'],
  standalone: false,
})
export class ReportAppBarComponent {
  @Input() presentation!: Readonly<ShellPresentation>;
  @Input() navigationOpen = false;
  @Output() intent = new EventEmitter<ShellIntent>();
  @Output() navigationToggle = new EventEmitter<void>();

  forwardIntent(shellIntent: ShellIntent): void {
    this.intent.emit(shellIntent);
  }
}
