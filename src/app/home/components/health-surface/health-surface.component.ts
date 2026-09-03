import {Component, Input} from '@angular/core';
import type {HealthPresentation, PrioritySignalPresentation} from '../../presentation';

@Component({
  selector: 'app-health-surface',
  templateUrl: './health-surface.component.html',
  styleUrls: ['./health-surface.component.scss'],
  standalone: false,
})
export class HealthSurfaceComponent {
  @Input() health!: Readonly<HealthPresentation>;
  @Input() prioritySignals: readonly PrioritySignalPresentation[] = [];
}
