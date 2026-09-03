import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import {
  TuiButton,
  TuiInput,
  TuiNotification,
  TuiRoot,
  provideTaiga,
  tuiAssetsPathProvider,
} from '@taiga-ui/core';
import { TuiBadge, TuiMessage, TuiSegmented } from '@taiga-ui/kit';
import { NgxEchartsModule } from 'ngx-echarts';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app/components/app/app.component';
import { HomeComponent } from './home/components/home/home.component';
import { MessageComponent } from './shared/components/message/message.component';
import { OverviewComponent } from './overview/components/overview/overview.component';
import { InfoComponent } from './info/components/info/info.component';
import { ScenarioComponent } from './scenario/components/scenario/scenario.component';
import { PhasesComponent } from './phases/components/phases/phases.component';
import { LatencyComponent } from './graph/components/latency/latency.component';
import { ReqLoadComponent } from './graph/components/req-load/req-load.component';
import { HttpCodeComponent } from './graph/components/http-code/http-code.component';
import { StarComponent } from './shared/components/star/star.component';
import { ReportDetailsComponent } from './report-details/components/report-details/report-details.component';
import { FileUploadModule } from './file-upload/file-upload.module';
import { HomeShellModule } from './home/home-shell.module';
import { ReportOverviewComponent } from './home/components/report-overview/report-overview.component';
import { KpiGridComponent } from './home/components/kpi-grid/kpi-grid.component';
import { ReportContextSummaryComponent } from './home/components/report-context-summary/report-context-summary.component';
import { TimelineSurfaceComponent } from './home/components/timeline-surface/timeline-surface.component';
import { EndpointSurfaceComponent } from './home/components/endpoint-surface/endpoint-surface.component';
import { HealthSurfaceComponent } from './home/components/health-surface/health-surface.component';
import { LatencySurfaceComponent } from './home/components/latency-surface/latency-surface.component';
import { ErrorSurfaceComponent } from './home/components/error-surface/error-surface.component';
import { ScenarioSurfaceComponent } from './home/components/scenario-surface/scenario-surface.component';
import { RawDataSurfaceComponent } from './home/components/raw-data-surface/raw-data-surface.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    MessageComponent,
    OverviewComponent,
    InfoComponent,
    ScenarioComponent,
    PhasesComponent,
    LatencyComponent,
    ReqLoadComponent,
    HttpCodeComponent,
    StarComponent,
    ReportDetailsComponent,
    ReportOverviewComponent,
    KpiGridComponent,
    ReportContextSummaryComponent,
    TimelineSurfaceComponent,
    EndpointSurfaceComponent,
    HealthSurfaceComponent,
    LatencySurfaceComponent,
    ErrorSurfaceComponent,
    ScenarioSurfaceComponent,
    RawDataSurfaceComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    FileUploadModule,
    HomeShellModule,
    TuiRoot,
    TuiButton,
    ...TuiInput,
    TuiBadge,
    TuiMessage,
    TuiSegmented,
    ...TuiNotification,
    NgxEchartsModule.forRoot({
      echarts: () => import('echarts'),
    }),
  ],
  providers: [
    ...provideTaiga(),
    tuiAssetsPathProvider('assets/taiga-ui/icons'),
    provideHttpClient(withXhr(), withInterceptorsFromDi()),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
