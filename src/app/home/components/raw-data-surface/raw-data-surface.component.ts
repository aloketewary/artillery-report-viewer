import { Component, EventEmitter, Input, Output } from '@angular/core';
import type {RawDataIntent, RawDataPresentation} from '../../presentation/presentation.contracts';

@Component({
  selector: 'app-raw-data-surface',
  templateUrl: './raw-data-surface.component.html',
  styleUrls: ['./raw-data-surface.component.scss'],
  standalone: false,
})
export class RawDataSurfaceComponent {
  @Input({required: true}) presentation!: Readonly<RawDataPresentation>;
  @Input() copyStatus = '';

  @Output() readonly intent = new EventEmitter<RawDataIntent>();

  isOpen = false;

  get summaryAction(): string {
    return this.isOpen ? 'Collapse' : 'Expand';
  }

  onToggle(event: Event): void {
    const details = event.currentTarget as HTMLDetailsElement | null;
    this.isOpen = Boolean(details?.open);
    this.intent.emit({type: 'toggle-raw-data', payload: {open: this.isOpen}});
  }

  onSearch(query: string): void {
    this.intent.emit({type: 'search-raw-data', payload: {query}});
  }

  copy(): void {
    this.intent.emit({type: 'copy-raw-data'});
  }

  download(): void {
    this.intent.emit({type: 'download-raw-data'});
  }
}
