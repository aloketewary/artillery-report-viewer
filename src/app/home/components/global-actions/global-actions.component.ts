import {Component, EventEmitter, Input, Output} from '@angular/core';
import type {ShellIntent, ThemeMode} from '../../presentation';

@Component({
  selector: 'app-global-actions',
  templateUrl: './global-actions.component.html',
  styleUrls: ['./global-actions.component.scss'],
  standalone: false,
})
export class GlobalActionsComponent {
  @Input() theme: ThemeMode = 'light';
  @Input() canExport = false;
  @Input() canReset = false;
  @Output() intent = new EventEmitter<ShellIntent>();

  exportReport(): void {
    this.intent.emit({type: 'export'});
  }

  downloadJson(): void {
    this.intent.emit({type: 'download-json'});
  }

  printReport(): void {
    this.intent.emit({type: 'print'});
  }

  toggleTheme(): void {
    this.intent.emit({
      type: 'toggle-theme',
      payload: {mode: this.theme === 'dark' ? 'light' : 'dark'},
    });
  }

  resetReport(): void {
    this.intent.emit({type: 'reset'});
  }
}
