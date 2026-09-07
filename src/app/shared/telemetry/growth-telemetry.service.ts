import {Injectable} from '@angular/core';

export type GrowthEventName =
  | 'landing_viewed'
  | 'sample_opened'
  | 'upload_started'
  | 'upload_completed'
  | 'upload_failed'
  | 'report_resumed'
  | 'report_replaced'
  | 'export_selected'
  | 'comparison_viewed';

export interface GrowthEvent {
  readonly name: GrowthEventName;
  readonly at: string;
  readonly properties?: Readonly<Record<string, string | number | boolean>>;
}

@Injectable({providedIn: 'root'})
export class GrowthTelemetryService {
  private readonly storageKey = 'arv-growth-events';
  private readonly maxEvents = 100;

  track(name: GrowthEventName, properties?: Readonly<Record<string, string | number | boolean>>): void {
    const event: GrowthEvent = {
      name,
      at: new Date().toISOString(),
      ...(properties ? {properties} : {}),
    };

    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = window.localStorage.getItem(this.storageKey);
      const events = stored ? JSON.parse(stored) as GrowthEvent[] : [];
      const nextEvents = [...(Array.isArray(events) ? events : []), event].slice(-this.maxEvents);
      window.localStorage.setItem(this.storageKey, JSON.stringify(nextEvents));
      window.dispatchEvent(new CustomEvent('arv:growth', {detail: event}));
    } catch {
      // Telemetry must never block report analysis or expose report contents.
    }
  }
}
