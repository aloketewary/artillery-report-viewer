import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {TuiButton} from '@taiga-ui/core';
import {TuiBadge, TuiFiles, TuiProgressBar} from '@taiga-ui/kit';
import {FileUploadComponent} from './components/file-upload/file-upload.component';

@NgModule({
  declarations: [FileUploadComponent],
  imports: [CommonModule, TuiButton, TuiBadge, ...TuiFiles, TuiProgressBar],
  exports: [FileUploadComponent],
})
export class FileUploadModule {}
