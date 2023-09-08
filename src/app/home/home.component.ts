import { Component, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ReportPayload } from '../model/report-payload';
import { ReportMetrics, ReportState } from '../model/report-state';
import { Latency, ReportItem, Rps } from '../model/report-item';
import { getIntegerDate } from '../shared/utils/helper';
import { ReportPhase } from '../model/report-phase';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject } from 'rxjs';
import { FileUploadComponent } from '../file-upload/file-upload.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  fileName?: string;
  options = this._formBuilder.group({
    bottom: 0,
    fixed: false,
    top: 0,
  });
  reportPayload: ReportPayload;
  reportState: ReportState = new ReportState();
  isDarkMode: boolean = false;
  isReset?: BehaviorSubject<string>;
  @ViewChild('fileUploadComp', {static: false}) fileUploadComp?: FileUploadComponent;

  constructor(private _formBuilder: FormBuilder, private snackbar: MatSnackBar) {
    this.reportPayload = new ReportPayload();
  }

  reset(_: string) {
    this.reportPayload = new ReportPayload();
    this.reportState = new ReportState();
    this.fileName = '';
  }

  onReportUploadAndProcessed(data: ReportState) {
    try {
      this.reportState = data;
      const payloadVersion = this.getPayloadVersion(data.report?.results);
      this.reportState.isLoaded = true;
      this.reportState.report!.version = payloadVersion;
      this.reportState.report!.results = payloadVersion === 1 ? this.reportState.report?.results : this.mapToLegacyObject(this.reportState.report?.results);
      this.reportState.hasCustomReportMetrics = this.validateCustomMetrics(this.reportState.report?.results);
    } catch (err: any) {
      this.showMessage(err.message);
      this.reset('_');
      this.isReset?.next('true');
      this.fileUploadComp?.reset();
    }
  }

  validateCustomMetrics(results: ReportPayload | undefined): boolean {
    const hasBothFields = results?.aggregate?.customStats !== undefined && results?.aggregate.counters !== undefined;
    const hasCustomStat = JSON.stringify(results?.aggregate?.customStats) !== JSON.stringify({});
    const hasCounters = JSON.stringify(results?.aggregate?.counters) !== JSON.stringify({});
    return hasBothFields && hasCustomStat && hasCounters;
  }

  getPayloadVersion(data?: ReportPayload): number {
    return data?.aggregate?.histograms ? 2 : 1 ?? 1;
  }

  mapToLegacyObject(results: ReportPayload | undefined): ReportPayload {
    return {
      aggregate: this.mapToLegacyBaseLevelObject(results?.aggregate),
      intermediate: this.mapToLegacyIntermediate(results),
    } as ReportPayload;
  }

  mapToLegacyIntermediate(results: ReportPayload | undefined): ReportItem[] {
    const dest = new Array<ReportItem>();
    results?.intermediate?.forEach((inter) => {
      dest.push(this.mapToLegacyBaseLevelObject(inter));
    });
    return dest;
  }

  mapToLegacyBaseLevelObject(aggregate?: ReportItem): ReportItem {
    const src = aggregate as any;
    const rps = new Rps();
    rps.mean = src.rates ? src?.rates['http.request_rate'] || src?.rates['engine.http.response_rate'] || src?.rates['engine.socketio.emit_rate'] || 0 : 0;
    rps.count = src?.counters['http.responses'] || src?.counters['engine.http.responses'] || src?.counters['engine.socketio.emit'] || 0;
    return {
      timestamp: new Date(getIntegerDate((aggregate as any).period)),
      scenariosCreated: src?.counters['vusers.created'] || src?.counters['core.vusers.created.total'] || 0,
      scenariosCompleted: src?.counters['vusers.completed'] || src?.counters['core.vusers.completed'] || 0,
      scenariosAvoided: src?.counters['vusers.skipped'] || src?.counters['core.vusers.skipped'] || 0,
      requestsCompleted: src?.counters['http.responses'] || src?.counters['engine.http.responses'] || src?.counters['engine.socketio.emit'] || src?.counters['engine.websocket.message_sent'] || 0,
      latency: this.mapToLegacyLatency(src),
      rps: rps,
      codes: this.mapLegacyCodes(src),
      errors: this.mapLegacyError(src),
      phases: this.mapToLegacyPhases(src)
    }
  }

  mapToLegacyPhases(src: any): ReportPhase[] {
    return new Array<ReportPhase>();
  }

  mapLegacyError(src: any): object {
    const propErr = 'errors.';
    const dest = {} as any;
    for (let prop in src.counters) {
      if (prop.startsWith(propErr)) {
        const propName: string = prop.replace(propErr, '');
        dest[propName] = src.counters[prop];
      }
    }
    return dest;
  }

  mapLegacyCodes(src: any): object {
    const propNameHttp = 'http.codes.';
    const propNameSocket = 'engine.socketio.codes.';
    const dest = {} as any;
    for (let prop in src.counters) {
      if (prop.startsWith(propNameHttp)) {
        const propName: string = prop.replace(propNameHttp, '');
        dest[propName] = src.counters[prop];
      }
      if (prop.startsWith(propNameSocket)) {
        const propName2: string = prop.replace(propNameSocket, '');
        dest[propName2] = src.counters[prop];
      }
    }
    return dest;
  }

  mapToLegacyLatency(summary: any): Latency {
    const src = summary.summaries;
    let selector = '';
    if (src['http.response_time']) {
      selector = 'http.response_time';
    } else if (src['engine.http.response_time']) {
      selector = 'engine.http.response_time';
    } else if (src['engine.http.socketio']) {
      selector = 'engine.http.socketio';
    } else {
      this.showMessage('Unable to parse latency');
    }
    const latency = new Latency();
    latency.min = src[selector]?.min || 0;
    latency.max = src[selector]?.max || 0;
    latency.median = src[selector]?.median || 0;
    latency.p50 = src[selector]?.median || 0;
    latency.p95 = src[selector]?.p95 || 0;
    latency.p99 = src[selector]?.p99 || 0;
    return latency;
  }

  onDownloadHit(data: any) {
    const stringifyData = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.reportState.report));
    const downloader = document.createElement('a');

    downloader.setAttribute('href', stringifyData);
    downloader.setAttribute('download', this.reportState.report?.name ?? 'report.json');
    downloader.click();
  }

  showMessage(message: string) {
    this.snackbar.open(message, undefined, {
      duration: 5 * 1000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }
}




