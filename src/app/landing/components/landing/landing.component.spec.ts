import {provideHttpClient} from '@angular/common/http';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {TuiButton, TuiNotification} from '@taiga-ui/core';
import {ReportMetrics, ReportState} from '../../../model/report-state';
import {FileUploadModule} from '../../../file-upload/file-upload.module';
import {HomeShellModule} from '../../../home/home-shell.module';
import {ReportSessionService} from '../../../shared/report/report-session.service';
import {LandingComponent} from './landing.component';

describe('LandingComponent', () => {
  let component: LandingComponent;
  let fixture: ComponentFixture<LandingComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HomeShellModule,
        FileUploadModule,
        TuiButton,
        ...TuiNotification,
      ],
      declarations: [LandingComponent],
      providers: [provideHttpClient(), provideRouter([])],
    });
    fixture = TestBed.createComponent(LandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the upload entry without report navigation chrome', () => {
    expect(fixture.nativeElement.querySelector('header.app-header')).toBeNull();
    expect(fixture.nativeElement.querySelector('main.shell-content')?.getAttribute('aria-label'))
      .toBe('PerfLens workspace');
    expect(fixture.nativeElement.querySelector('nav[aria-label="Report sections"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.upload-surface[role="group"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#upload-surface-title')?.textContent)
      .toContain('Upload a performance report');
  });

  it('keeps invalid JSON visible through the Taiga notification state', () => {
    component.onUploadStateChanged({kind: 'invalid-json', message: 'This file is not valid JSON.'});
    component.onFileError('This file is not valid JSON.');
    fixture.detectChanges();

    expect(component.uploadState.kind).toBe('invalid-json');
    expect(component.uploadStateMessage()).toBe('This file is not valid JSON.');
    expect(fixture.nativeElement.querySelector('[tuiNotification]')?.textContent)
      .toContain('Invalid JSON file');
    expect(fixture.nativeElement.textContent).toContain('This file is not valid JSON.');
  });

  it('normalizes an uploaded Artillery report before navigating to report', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
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

    const session = TestBed.inject(ReportSessionService).current;
    expect(session?.fileName).toBe('report.json');
    expect(session?.parsed.version).toBe(2);
    expect(session?.report.summary.requestsCompleted).toBe(3);
    expect(router.navigate).toHaveBeenCalledWith(['/home/report']);
  });

  it('maps unsupported Artillery shapes to the unsupported state', () => {
    const data = new ReportState();
    data.report = new ReportMetrics('report.json', 0);
    data.report.rawResults = {notAnArtilleryReport: true};

    component.onReportUploadAndProcessed(data);

    expect(component.uploadState.kind).toBe('unsupported-shape');
  });
});
