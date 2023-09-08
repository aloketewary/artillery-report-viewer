import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ReportPayload } from '../model/report-payload';
import { ReportMetrics, ReportState } from '../model/report-state';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent {
  @Input() requiredFileType?: string;
  @Input() isReset?: BehaviorSubject<string>;
  @ViewChild('fileUpload') fileUpload?: ElementRef;
  fileName = '';
  uploadProgress: number | null = null;
  isFileUpload: boolean = false;
  fileDetail?: ReportPayload;
  reportData?: ReportState;
  @Output() onFileProcess: EventEmitter<ReportState> = new EventEmitter<ReportState>();
  @Output() onReset: EventEmitter<string> = new EventEmitter<string>();


  constructor() {
    this.isReset?.subscribe((_) => this.reset());
   }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];

    if (file) {
      this.fileName = file.name;
      const formData = new FormData();
      formData.append("thumbnail", file);
      this.processTheJson(file);

    }
  }

  cancelUpload() {
    this.reset();
  }

  reset() {
    this.uploadProgress = null;
    this.fileName = '';
    this.isFileUpload = false;
    this.fileDetail = undefined;
    this.reportData = undefined;
    if(this.fileUpload?.nativeElement?.value) {
      this.fileUpload.nativeElement.value = null;
    }
    this.onReset.emit('null');
  }

  processTheJson(fileData: File) {
    try {
      fileData.text().then((val) => {
        this.fileDetail = JSON.parse(val) as ReportPayload;
        this.isFileUpload = true;
        this.reportData = new ReportState();
        this.reportData.report =  new ReportMetrics(this.fileName, 0);
        this.reportData.report.results = this.fileDetail;
        this.onFileProcess.emit(this.reportData);
      }).catch(err => {
        throw err;
      }) ;
    } catch (error: any) {
      console.error(error.message);
    }
  }
}
