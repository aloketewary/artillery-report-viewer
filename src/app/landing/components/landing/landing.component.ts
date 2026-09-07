import {HttpClient} from '@angular/common/http';
import {Component, OnInit, ViewChild} from '@angular/core';
import {Router} from '@angular/router';
import {FileUploadComponent} from '../../../file-upload/components/file-upload/file-upload.component';
import {ReportState} from '../../../model/report-state';
import {normalizeArtilleryReport} from '../../../shared/report/performance-report-adapter';
import {ParsedReport, parseArtilleryReport} from '../../../shared/report/report-adapter';
import {ReportSessionService} from '../../../shared/report/report-session.service';
import {ReportValidationError, reportValidationMessage} from '../../../shared/report/report-validation-error';
import {GrowthTelemetryService} from '../../../shared/telemetry/growth-telemetry.service';
import {ShellPresentation, UploadUiState} from '../../../home/presentation/presentation.contracts';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  standalone: false,
})
export class LandingComponent {
  errorMessage = '';
  isLoading = false;
  isRestoringReport = false;
  savedReportName = '';
  uploadState: UploadUiState = {kind: 'idle'};
  readonly localProcessingMessage = 'Your report is read and analyzed in this browser. Report contents are not uploaded.';

  @ViewChild('fileUploadComp', {static: false}) fileUploadComp?: FileUploadComponent;

  constructor(
    private readonly http: HttpClient,
    private readonly reportSession: ReportSessionService,
    private readonly router: Router,
    private readonly telemetry: GrowthTelemetryService,
  ) {}

  ngOnInit(): void {
    this.telemetry.track('landing_viewed');
    this.isRestoringReport = true;
    void this.reportSession.restore().then((session) => {
      this.savedReportName = session?.fileName ?? '';
      this.isRestoringReport = false;
    });
  }

  get shellPresentation(): Readonly<ShellPresentation> {
    return {
      mode: 'entry',
      theme: 'dark',
      navigation: [],
      canExport: false,
      canReset: false,
    };
  }

  loadSampleReport(): void {
    if (this.isUploadBusy()) {
      return;
    }

    this.telemetry.track('sample_opened');
    this.errorMessage = '';
    this.isLoading = true;
    this.setUploadState({kind: 'reading'});
    this.http.get<unknown>('assets/report.json').subscribe({
      next: (source) => {
        try {
          this.setUploadState({kind: 'processing', fileName: 'report.json'});
          this.loadSource(source, 'report.json');
        } catch (error: unknown) {
          const message = reportValidationMessage(error, 'Unable to load the sample report.');
          this.setUploadError(error, message);
          this.onFileError(message);
        } finally {
          this.isLoading = false;
        }
      },
      error: () => {
        this.isLoading = false;
        const message = 'Unable to load the sample report. Upload a JSON report to continue.';
        this.setUploadState({kind: 'retry', message});
        this.onFileError(message);
      },
    });
  }

  resumeSavedReport(): void {
    if (this.isRestoringReport || this.isUploadBusy()) {
      return;
    }

    this.isRestoringReport = true;
    void this.reportSession.restore().then((session) => {
      this.isRestoringReport = false;
      if (!session) {
        this.savedReportName = '';
        this.errorMessage = 'Saved report is no longer available. Upload a JSON report to continue.';
        return;
      }
      this.telemetry.track('report_resumed', {fileName: session.fileName});
      void this.router.navigate(['/home/report']);
    });
  }

  clearSavedReport(): void {
    this.reportSession.discardSavedReports();
    this.savedReportName = '';
  }

  reset(_: string): void {
    this.reportSession.clear();
    this.isLoading = false;
    this.errorMessage = '';
    this.setUploadState({kind: 'idle'});
  }

  onReportUploadAndProcessed(data: ReportState): void {
    try {
      const source = data.report?.rawResults ?? data.report?.results;
      if (!source) {
        throw new ReportValidationError('missing-report-data');
      }
      this.loadSource(source, data.report?.name || 'report.json');
    } catch (error: unknown) {
      const message = reportValidationMessage(error, 'Unable to parse report.');
      this.setUploadError(error, message);
      this.onFileError(message);
    }
  }

  onUploadStateChanged(state: UploadUiState): void {
    this.uploadState = state;
  }

  onFileError(message: string): void {
    this.telemetry.track('upload_failed', {message});
    this.reportSession.clear();
    const stateBeforeReset = this.uploadState;
    this.isLoading = false;
    this.errorMessage = message;
    this.fileUploadComp?.reset(false);
    this.setUploadState(this.isRecoveryState(stateBeforeReset)
      ? stateBeforeReset
      : {kind: 'retry', message});
  }

  uploadStateMessage(): string {
    switch (this.uploadState.kind) {
      case 'idle': return 'Choose or drop an Artillery JSON report.';
      case 'drag-over': return 'Release to read the first selected file.';
      case 'reading': return `Reading ${this.uploadState.fileName ?? 'the selected report'}.`;
      case 'processing': return `Processing ${this.uploadState.fileName ?? 'the report'} in this browser.`;
      case 'ready': return `${this.uploadState.fileName} is ready.`;
      case 'invalid-extension':
      case 'invalid-json':
      case 'unsupported-shape':
      case 'retry': return this.uploadState.message;
    }
  }

  isUploadBusy(): boolean {
    return this.isLoading || this.uploadState.kind === 'reading' || this.uploadState.kind === 'processing';
  }

  sampleLoadingTitle(): string {
    return this.uploadState.kind === 'processing' ? 'Processing sample report.' : 'Reading sample report.';
  }

  sampleLoadingMessage(): string {
    return this.uploadState.kind === 'processing'
      ? 'Processing report.json in this browser.'
      : 'Reading report.json from the local sample asset.';
  }

  private setUploadError(error: unknown, message: string): void {
    if (error instanceof ReportValidationError) {
      switch (error.code) {
        case 'invalid-file-type':
          this.setUploadState({kind: 'invalid-extension', message});
          return;
        case 'invalid-json':
          this.setUploadState({kind: 'invalid-json', message});
          return;
        case 'invalid-root':
        case 'unsupported-format':
        case 'unsupported-schema':
          this.setUploadState({kind: 'unsupported-shape', message});
          return;
        default:
          break;
      }
    }
    this.setUploadState({kind: 'retry', message});
  }

  private isRecoveryState(state: UploadUiState): state is Extract<UploadUiState, {readonly message: string}> {
    return state.kind === 'invalid-extension'
      || state.kind === 'invalid-json'
      || state.kind === 'unsupported-shape'
      || state.kind === 'retry';
  }

  private loadSource(source: unknown, fileName: string): void {
    const parsed: ParsedReport = parseArtilleryReport(source);
    const normalized = normalizeArtilleryReport(parsed, fileName);
    this.reportSession.set({fileName, parsed, report: normalized});
    this.telemetry.track('upload_completed', {fileName});
    this.errorMessage = '';
    this.uploadState = {kind: 'ready', fileName};
    void this.router.navigate(['/home/report']);
  }

  private setUploadState(state: UploadUiState): void {
    this.uploadState = state;
  }
}
