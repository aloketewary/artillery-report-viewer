import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { ReportMetrics, ReportState } from '../model/report-state';

@Component({
    selector: 'app-file-upload',
    templateUrl: './file-upload.component.html',
    styleUrls: ['./file-upload.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class FileUploadComponent {
  @Input() requiredFileType?: string;
  @ViewChild('fileUpload') fileUpload?: ElementRef<HTMLInputElement>;
  fileName = '';
  uploadProgress: number | null = null;
  isFileUpload = false;
  fileDetail?: unknown;
  reportData?: ReportState;
  @Output() onFileProcess = new EventEmitter<ReportState>();
  @Output() onReset = new EventEmitter<string>();
  @Output() onFileError = new EventEmitter<string>();
  private selectionId = 0;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
      this.handleError('Please select an Artillery JSON report.');
      return;
    }

    const selectionId = ++this.selectionId;
    this.fileName = file.name;
    void this.processTheJson(file, selectionId);
  }

  cancelUpload(): void {
    this.reset();
  }

  reset(emit = true): void {
    this.selectionId += 1;
    this.uploadProgress = null;
    this.fileName = '';
    this.isFileUpload = false;
    this.fileDetail = undefined;
    this.reportData = undefined;
    if (this.fileUpload?.nativeElement) {
      this.fileUpload.nativeElement.value = '';
    }
    if (emit) {
      this.onReset.emit('reset');
    }
  }

  async processTheJson(fileData: File, selectionId = this.selectionId): Promise<void> {
    try {
      const parsed: unknown = JSON.parse(await fileData.text());
      if (selectionId !== this.selectionId) {
        return;
      }
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Report must contain a JSON object.');
      }

      this.fileDetail = parsed;
      this.isFileUpload = true;
      this.reportData = new ReportState();
      this.reportData.report = new ReportMetrics(this.fileName, 0);
      this.reportData.report.rawResults = parsed;
      this.onFileProcess.emit(this.reportData);
    } catch (error: unknown) {
      if (selectionId === this.selectionId) {
        this.handleError(this.errorMessage(error));
      }
    }
  }

  private handleError(message: string): void {
    this.reset(false);
    this.onFileError.emit(message);
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unable to read report file.';
  }
}
