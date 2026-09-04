import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {TuiTable} from '@taiga-ui/addon-table';
import {TuiAccordion, TuiBadge, TuiDataListWrapper, TuiMessage, TuiMultiSelect, TuiSegmented, TuiSelect} from '@taiga-ui/kit';
import {TuiButton, TuiIcon, TuiInput, TuiNotification, TuiRoot} from '@taiga-ui/core';
import {ReportMetrics, ReportState} from '../../../model/report-state';
import {HomeComponent} from './home.component';
import {FileUploadComponent} from '../../../file-upload/components/file-upload/file-upload.component';
import {InfoComponent} from '../../../info/components/info/info.component';
import {OverviewComponent} from '../../../overview/components/overview/overview.component';
import {MessageComponent} from '../../../shared/components/message/message.component';
import {ReportDetailsComponent} from '../../../report-details/components/report-details/report-details.component';
import {StarComponent} from '../../../shared/components/star/star.component';
import {AppShellComponent} from '../app-shell/app-shell.component';
import {BrandBlockComponent} from '../brand-block/brand-block.component';
import {GlobalActionsComponent} from '../global-actions/global-actions.component';
import {ReportContextComponent} from '../report-context/report-context.component';
import {ReportSectionNavComponent} from '../report-section-nav/report-section-nav.component';
import {ReportOverviewComponent} from '../report-overview/report-overview.component';
import {KpiGridComponent} from '../kpi-grid/kpi-grid.component';
import {ReportContextSummaryComponent} from '../report-context-summary/report-context-summary.component';
import {TimelineSurfaceComponent} from '../timeline-surface/timeline-surface.component';
import {EndpointSurfaceComponent} from '../endpoint-surface/endpoint-surface.component';
import {HealthSurfaceComponent} from '../health-surface/health-surface.component';
import {LatencySurfaceComponent} from '../latency-surface/latency-surface.component';
import {ErrorSurfaceComponent} from '../error-surface/error-surface.component';
import {ScenarioSurfaceComponent} from '../scenario-surface/scenario-surface.component';
import {RawDataSurfaceComponent} from '../raw-data-surface/raw-data-surface.component';
import {NgxEchartsModule} from 'ngx-echarts';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TuiRoot,
        TuiButton,
        TuiIcon,
        ...TuiInput,
        TuiBadge,
        ...TuiAccordion,
        ...TuiDataListWrapper,
        TuiMessage,
        TuiSegmented,
        ...TuiSelect,
        ...TuiNotification,
        ...TuiTable,
        ...TuiMultiSelect,
        NgxEchartsModule.forRoot({echarts: () => import('echarts')}),
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
        AppShellComponent,
        BrandBlockComponent,
        GlobalActionsComponent,
        ReportContextComponent,
        ReportSectionNavComponent,
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
    });
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('keeps active anchor state in sync for native fragment links', () => {
    component.onShellIntent({type: 'navigate', payload: {anchor: 'performance'}});

    expect(component.activeAnchor).toBe('performance');
  });

  it('normalizes an uploaded Artillery report for report replacement', () => {
    const data = new ReportState();
    data.report = new ReportMetrics('report.json', 0);
    data.report.rawResults = {
      aggregate: {
        counters: {
          'http.responses': 3,
          'http.codes.200': 2,
          'vusers.created': 1,
        },
        rates: {'http.request_rate': 1},
        summaries: {'http.response_time': {p50: 25}},
      },
      intermediate: [],
    };

    component.onReportUploadAndProcessed(data);

    expect(component.reportState.isLoaded).toBeTrue();
    expect(component.reportState.report?.version).toBe(2);
    expect(component.reportState.report?.results?.aggregate?.requestsCompleted).toBe(3);
    expect(component.reportState.report?.results?.aggregate?.codes).toEqual({'200': 2});
  });

  it('renders an honest no-baseline comparison state without fabricated deltas', () => {
    component.reportState.isLoaded = true;
    fixture.detectChanges();

    const comparison = fixture.debugElement.query(By.css('#comparison'))?.nativeElement as HTMLElement | undefined;
    expect(comparison).not.toBeNull();
    if (!comparison) {
      return;
    }

    const compareButton = comparison.querySelector('button') as HTMLButtonElement;
    expect(comparison.textContent).toContain('No baseline available');
    expect(comparison.textContent).toContain('No deltas or trend values are shown');
    expect(compareButton.disabled).toBeTrue();
    expect(compareButton.getAttribute('aria-disabled')).toBe('true');
    expect(comparison.textContent).not.toContain('Upload a previous report');
  });

  it('presents the complete report projection without exporting raw JSON', () => {
    const data = new ReportState();
    data.report = new ReportMetrics('report.json', 0);
    data.report.rawResults = {
      aggregate: {
        counters: {
          'http.responses': 3,
          'http.codes.200': 2,
          'vusers.created': 1,
        },
        rates: {'http.request_rate': 1},
        summaries: {'http.response_time': {p50: 25, p95: 50, p99: 75}},
      },
      intermediate: [],
    };

    component.onReportUploadAndProcessed(data);
    component.reportView.fileName = 'run<&>.json';
    component.reportView.statusLabel = 'PASSED';
    component.reportView.insight = 'Check <latency> & errors';
    component.reportView.errors = [{name: 'Timeout <upstream>', count: 2, endpoint: '/api/items'}];
    component.reportView.raw = {secret: 'must stay local'};
    component.reportView.rawJson = '{"secret":"must stay local"}';
    component.reportView.timeline = Array.from({length: 121}, (_, index) => ({
      requestsCompleted: index,
      throughputRps: index,
    }));

    const html = (component as unknown as {buildExportHtml: () => string}).buildExportHtml();

    expect(html).toContain('run&lt;&amp;&gt;.json');
    expect(html).toContain('PASSED');
    expect(html).toContain('Check &lt;latency&gt; &amp; errors');
    expect(html).toContain('<h2>Insights</h2>');
    expect(html).toContain('Timeout &lt;upstream&gt;');
    expect(html).toContain('Requests');
    expect(html).toContain('Throughput');
    expect(html).toContain('Error Rate');
    expect(html).toContain('P95 Latency');
    expect(html).toContain('P99 Latency');
    expect(html).toContain('Duration');
    expect(html).toContain('N/A');
    expect(html).not.toContain('{"secret":"must stay local"}');
  });
});
