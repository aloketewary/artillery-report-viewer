import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { TuiButton, TuiNotification, TuiRoot, provideTaiga } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { NgxEchartsModule } from 'ngx-echarts';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { MessageComponent } from './shared/message/message.component';
import { OverviewComponent } from './overview/overview.component';
import { InfoComponent } from './info/info.component';
import { ScenarioComponent } from './scenario/scenario.component';
import { FileUploadComponent } from './file-upload/file-upload.component';
import { PhasesComponent } from './phases/phases.component';
import { LatencyComponent } from './graph/latency/latency.component';
import { ReqLoadComponent } from './graph/req-load/req-load.component';
import { HttpCodeComponent } from './graph/http-code/http-code.component';
import { StarComponent } from './shared/star/star.component';
import { ReportDetailsComponent } from './report-details/report-details.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    MessageComponent,
    OverviewComponent,
    InfoComponent,
    ScenarioComponent,
    FileUploadComponent,
    PhasesComponent,
    LatencyComponent,
    ReqLoadComponent,
    HttpCodeComponent,
    StarComponent,
    ReportDetailsComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    TuiRoot,
    TuiButton,
    TuiBadge,
    ...TuiNotification,
    NgxEchartsModule.forRoot({
      echarts: () => import('echarts'),
    }),
  ],
  providers: [
    ...provideTaiga(),
    provideHttpClient(withXhr(), withInterceptorsFromDi()),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
