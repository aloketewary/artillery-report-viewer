import { Injectable } from '@angular/core';
import { PerformanceReport } from '../../model/performance-report';
import { ParsedReport } from './report-adapter';

export interface ReportSession {
  fileName: string;
  parsed: ParsedReport;
  report: PerformanceReport;
}

interface StoredReportSessions {
  current?: ReportSession;
  previous?: ReportSession;
  savedAt: string;
}

@Injectable({providedIn: 'root'})
export class ReportSessionService {
  private session?: ReportSession;
  private previousSession?: ReportSession;
  private databasePromise?: Promise<IDBDatabase | undefined>;

  get current(): ReportSession | undefined {
    return this.session;
  }

  get previous(): ReportSession | undefined {
    return this.previousSession;
  }

  set(session: ReportSession): void {
    if (this.session && this.session !== session) {
      this.previousSession = this.session;
    }
    this.session = session;
    void this.persist();
  }

  clear(preserveAsPrevious = false): void {
    if (preserveAsPrevious && this.session) {
      this.previousSession = this.session;
    }
    this.session = undefined;
    void this.persist();
  }

  discardSavedReports(): void {
    this.session = undefined;
    this.previousSession = undefined;
    void this.persist();
  }

  async restore(): Promise<ReportSession | undefined> {
    if (this.session) {
      return this.session;
    }

    const stored = await this.readStoredSessions();
    if (!stored) {
      return undefined;
    }

    this.session = stored.current;
    this.previousSession = stored.previous;
    return this.session;
  }

  private async persist(): Promise<void> {
    const database = await this.openDatabase();
    if (!database) {
      return;
    }

    await new Promise<void>((resolve) => {
      const transaction = database.transaction('reports', 'readwrite');
      transaction.objectStore('reports').put({
        current: this.session,
        previous: this.previousSession,
        savedAt: new Date().toISOString(),
      } satisfies StoredReportSessions, 'last');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    });
  }

  private async readStoredSessions(): Promise<StoredReportSessions | undefined> {
    const database = await this.openDatabase();
    if (!database) {
      return undefined;
    }

    return new Promise<StoredReportSessions | undefined>((resolve) => {
      const request = database.transaction('reports', 'readonly').objectStore('reports').get('last');
      request.onsuccess = () => resolve(request.result as StoredReportSessions | undefined);
      request.onerror = () => resolve(undefined);
    });
  }

  private openDatabase(): Promise<IDBDatabase | undefined> {
    if (this.databasePromise) {
      return this.databasePromise;
    }

    if (typeof indexedDB === 'undefined') {
      this.databasePromise = Promise.resolve(undefined);
      return this.databasePromise;
    }

    this.databasePromise = new Promise<IDBDatabase | undefined>((resolve) => {
      const request = indexedDB.open('artillery-report-viewer', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('reports');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(undefined);
      request.onblocked = () => resolve(undefined);
    });

    return this.databasePromise;
  }
}
