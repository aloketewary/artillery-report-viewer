import {Component, EventEmitter, Input, Output} from '@angular/core';
import {
  REPORT_SECTION_NAVIGATION,
  ReportAnchorId,
  ShellIntent,
  ShellPresentation,
} from '../../presentation';

const DEFAULT_SHELL_PRESENTATION: Readonly<ShellPresentation> = {
  mode: 'entry',
  theme: 'light',
  navigation: REPORT_SECTION_NAVIGATION,
  canExport: false,
  canReset: false,
};

@Component({
  selector: 'app-shell',
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss'],
  standalone: false,
})
export class AppShellComponent {
  @Input() presentation: Readonly<ShellPresentation> = DEFAULT_SHELL_PRESENTATION;
  @Input() activeAnchor: ReportAnchorId = 'overview';
  @Output() intent = new EventEmitter<ShellIntent>();

  navigationOpen = false;

  toggleNavigation(): void {
    this.navigationOpen = !this.navigationOpen;
  }

  forwardIntent(shellIntent: ShellIntent): void {
    if (shellIntent.type === 'navigate' || shellIntent.type === 'reset') {
      this.navigationOpen = false;
    }

    this.intent.emit(shellIntent);
  }
}
