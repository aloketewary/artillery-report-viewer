import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';


import { NgModule } from '@angular/core';
import { BrowserModule, DomSanitizer } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HomeComponent } from './home/home.component';
import { MatRippleModule } from '@angular/material/core';
import { MessageComponent } from './shared/message/message.component';
import { OverviewComponent } from './overview/overview.component';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { FlexLayoutModule } from '@angular/flex-layout';
import { InfoComponent } from './info/info.component';
import { ScenarioComponent } from './scenario/scenario.component';
import { FileUploadComponent } from './file-upload/file-upload.component';
import { PhasesComponent } from './phases/phases.component';
import { NgxEchartsModule } from 'ngx-echarts';
import { LatencyComponent } from './graph/latency/latency.component';
import { ReqLoadComponent } from './graph/req-load/req-load.component';
import { HttpCodeComponent } from './graph/http-code/http-code.component';
import { StarComponent } from './shared/star/star.component';
import { HttpClientModule } from '@angular/common/http';

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
    StarComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
    MatToolbarModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatRippleModule,
    MatCardModule,
    MatDividerModule,
    FlexLayoutModule,
    MatProgressBarModule,
    MatListModule,
    MatSelectModule,
    NgxEchartsModule.forRoot({
      echarts: () => import('echarts')
    }),
    MatBadgeModule,
    MatSnackBarModule,
    MatChipsModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {

  constructor(
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer) {
      this.matIconRegistry.addSvgIcon(
        "github",
        this.domSanitizer.bypassSecurityTrustResourceUrl("../assets/icons/github-mark-white.svg")
      );
      this.matIconRegistry.addSvgIcon(
        "github-dark",
        this.domSanitizer.bypassSecurityTrustResourceUrl("../assets/icons/github-mark.svg")
      );
  }
}
