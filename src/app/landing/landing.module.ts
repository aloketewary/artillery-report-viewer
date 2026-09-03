import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule, Routes} from '@angular/router';
import {TuiButton, TuiLoader, TuiNotification} from '@taiga-ui/core';
import {FileUploadModule} from '../file-upload/file-upload.module';
import {LandingComponent} from './components/landing/landing.component';
import { HomeShellModule } from '../home/home-shell.module';

const routes: Routes = [
  {path: '', component: LandingComponent},
];

@NgModule({
  declarations: [LandingComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    TuiButton,
    TuiLoader,
    ...TuiNotification,
    FileUploadModule,
    HomeShellModule,
  ],
})
export class LandingModule {}
