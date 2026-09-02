import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TuiBadge, TuiMultiSelect } from '@taiga-ui/kit';
import { TuiButton, TuiNotification, TuiRoot } from '@taiga-ui/core';
import { ReportMetrics, ReportState } from '../model/report-state';
import { HomeComponent } from './home.component';
import { FileUploadComponent } from '../file-upload/file-upload.component';
import { InfoComponent } from '../info/info.component';
import { OverviewComponent } from '../overview/overview.component';
import { MessageComponent } from '../shared/message/message.component';
import { ReportDetailsComponent } from '../report-details/report-details.component';
import { StarComponent } from '../shared/star/star.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TuiRoot,
        TuiButton,
        TuiBadge,
        ...TuiNotification,
        ...TuiMultiSelect,
        ReactiveFormsModule,
        FormsModule,
      ],
      declarations: [
        HomeComponent,
        FileUploadComponent,
        InfoComponent,
        OverviewComponent,
        MessageComponent,
        ReportDetailsComponent,
        StarComponent,
      ],
    });
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('normalizes an uploaded Artillery report before rendering dashboards', () => {
    const data = new ReportState();
    data.report = new ReportMetrics('report.json', 0);
    data.report.rawResults = {
      aggregate: {
        counters: {
          'http.responses': 3,
          'http.codes.200': 2,
          'vusers.created': 1,
        },
        rates: { 'http.request_rate': 1 },
        summaries: { 'http.response_time': { p50: 25 } },
      },
      intermediate: [],
    };

    component.onReportUploadAndProcessed(data);

    expect(component.reportState.isLoaded).toBeTrue();
    expect(component.reportState.report?.version).toBe(2);
    expect(component.reportState.report?.results?.aggregate?.requestsCompleted).toBe(3);
    expect(component.reportState.report?.results?.aggregate?.codes).toEqual({ '200': 2 });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
