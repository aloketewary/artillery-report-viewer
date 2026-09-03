import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { ReportMetrics, ReportState } from '../../../model/report-state';
import { DEFAULT_MAX_FILE_SIZE_BYTES } from '../../file-upload.config';
import { ReportValidationError, fileTooLargeMessage, formatFileSize, reportValidationMessage } from '../../../shared/report/report-validation-error';
import { UploadUiState } from '../../../home/presentation/presentation.contracts';
import {TuiFileLike} from '@taiga-ui/kit';

@Component({
    selector: 'app-file-upload',
    templateUrl: './file-upload.component.html',
    styleUrls: ['./file-upload.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class FileUploadComponent {
  @Input() requiredFileType?: string;
  @Input() maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES;
  @ViewChild('fileUpload') fileUpload?: ElementRef<HTMLInputElement>;
  fileName = '';
  selectedFile: TuiFileLike | null = null;
  uploadProgress: number | null = null;
  isFileUpload = false;
  fileDetail?: unknown;
  reportData?: ReportState;
  isDragging = false;
  isProcessing = false;
  uploadState: UploadUiState = {kind: 'idle'};
  @Output() onFileProcess = new EventEmitter<ReportState>();
  @Output() onReset = new EventEmitter<string>();
  @Output() onFileError = new EventEmitter<string>();
  @Output() onStateChange = new EventEmitter<UploadUiState>();
  private selectionId = 0;

  openFileDialog(): void {
    if (this.isProcessing) {
      return;
    }
    this.fileUpload?.nativeElement.click();
  }

  onDropZoneKeydown(event: KeyboardEvent): void {
    if (this.isProcessing || event.target !== event.currentTarget) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openFileDialog();
    }
  }

  onFileSelected(event: Event): void {
    if (this.isProcessing) {
      return;
    }
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.processSelectedFile(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.isProcessing) {
      return;
    }
    this.isDragging = true;
    this.setUploadState({kind: 'drag-over'});
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    if (!this.isProcessing) {
      this.setUploadState(this.isFileUpload ? {kind: 'ready', fileName: this.fileName} : {kind: 'idle'});
    }
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    if (this.isProcessing) {
      return;
    }

    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.processSelectedFile(file);
    }
  }

  private processSelectedFile(file: File): void {
    if (this.isProcessing) {
      return;
    }
    this.setUploadState({kind: 'reading', fileName: file.name});
    if (!file.name.toLowerCase().endsWith('.json')) {
      this.handleError(new ReportValidationError('invalid-file-type'));
      return;
    }

    const maxFileSizeBytes = Number.isFinite(this.maxFileSizeBytes) && this.maxFileSizeBytes >= 0
      ? this.maxFileSizeBytes
      : DEFAULT_MAX_FILE_SIZE_BYTES;
    if (file.size > maxFileSizeBytes) {
      this.handleError(new ReportValidationError('file-too-large', undefined, fileTooLargeMessage(maxFileSizeBytes)));
      return;
    }

    const selectionId = ++this.selectionId;
    this.fileName = file.name;
    this.selectedFile = {name: file.name, size: file.size, type: file.type};
    this.isProcessing = true;
    this.setUploadState({kind: 'reading', fileName: file.name});
    void this.processTheJson(file, selectionId);
  }

  formatFileSize(bytes: number): string {
    return formatFileSize(bytes);
  }

  cancelUpload(): void {
    this.reset();
  }

  reset(emit = true): void {
    this.selectionId += 1;
    this.uploadProgress = null;
    this.fileName = '';
    this.selectedFile = null;
    this.isFileUpload = false;
    this.isDragging = false;
    this.isProcessing = false;
    this.fileDetail = undefined;
    this.reportData = undefined;
    this.setUploadState({kind: 'idle'});
    if (this.fileUpload?.nativeElement) {
      this.fileUpload.nativeElement.value = '';
    }
    if (emit) {
      this.onReset.emit('reset');
    }
  }

  async processTheJson(fileData: File, selectionId = this.selectionId): Promise<void> {
    try {
      const text = await fileData.text();
      if (selectionId !== this.selectionId) {
        return;
      }
      this.setUploadState({kind: 'processing', fileName: this.fileName});
      const parsed: unknown = JSON.parse(text);
      if (selectionId !== this.selectionId) {
        return;
      }
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new ReportValidationError('invalid-root');
      }

      this.fileDetail = parsed;
      this.isFileUpload = true;
      this.reportData = new ReportState();
      this.reportData.report = new ReportMetrics(this.fileName, 0);
      this.reportData.report.rawResults = parsed;
      this.onFileProcess.emit(this.reportData);
      if (selectionId === this.selectionId && this.isFileUpload) {
        this.setUploadState({kind: 'ready', fileName: this.fileName});
      }
    } catch (error: unknown) {
      if (selectionId === this.selectionId) {
        const validationError = error instanceof SyntaxError ? new ReportValidationError('invalid-json', error) : error;
        this.handleError(validationError);
      }
    } finally {
      if (selectionId === this.selectionId) {
        this.isProcessing = false;
      }
    }
  }

  private handleError(error: unknown): void {
    const message = this.errorMessage(error);
    this.reset(false);
    this.setUploadState(this.errorState(error, message));
    this.onFileError.emit(message);
  }

  private errorState(error: unknown, message: string): UploadUiState {
    if (error instanceof ReportValidationError) {
      switch (error.code) {
        case 'invalid-file-type':
          return {kind: 'invalid-extension', message};
        case 'invalid-json':
          return {kind: 'invalid-json', message};
        case 'invalid-root':
        case 'unsupported-format':
        case 'unsupported-schema':
          return {kind: 'unsupported-shape', message};
        default:
          return {kind: 'retry', message};
      }
    }
    return {kind: 'retry', message};
  }

  private setUploadState(state: UploadUiState): void {
    this.uploadState = state;
    this.onStateChange.emit(state);
  }

  private errorMessage(error: unknown): string {
    return reportValidationMessage(error, 'Unable to read report file.');
  }
}
