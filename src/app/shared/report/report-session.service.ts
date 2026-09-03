import { Injectable } from '@angular/core';
import { PerformanceReport } from '../../model/performance-report';
import { ParsedReport } from './report-adapter';

export interface ReportSession {
  fileName: string;
  parsed: ParsedReport;
  report: PerformanceReport;
}

@Injectable({providedIn: 'root'})
export class ReportSessionService {
  private session?: ReportSession;

  get current(): ReportSession | undefined {
    return this.session;
  }

  set(session: ReportSession): void {
    this.session = session;
  }

  clear(): void {
    this.session = undefined;
  }
}
