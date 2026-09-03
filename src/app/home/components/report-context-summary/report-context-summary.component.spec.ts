import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ReportContextPresentation} from '../../presentation';
import {ReportContextSummaryComponent} from './report-context-summary.component';

describe('ReportContextSummaryComponent', () => {
  let component: ReportContextSummaryComponent;
  let fixture: ComponentFixture<ReportContextSummaryComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ReportContextSummaryComponent],
    });
    fixture = TestBed.createComponent(ReportContextSummaryComponent);
    component = fixture.componentInstance;
  });

  it('preserves supplied context values and explicit unavailable metadata', () => {
    const context: ReportContextPresentation = {
      fileName: {value: 'run.json', display: 'run.json', availability: 'measured'},
      startedAt: {display: 'N/A', availability: 'unavailable'},
      format: {value: 'artillery', display: 'Artillery JSON', availability: 'measured'},
      duration: {display: 'N/A', availability: 'unavailable'},
      status: {value: 'healthy', display: 'Healthy', availability: 'calculated'},
      statusLabel: 'PASSED',
    };
    component.context = context;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('run.json');
    expect(fixture.nativeElement.textContent).toContain('Artillery JSON');
    expect(fixture.nativeElement.textContent).toContain('N/A');
    expect(fixture.nativeElement.textContent).toContain('Calculated');
    expect(fixture.nativeElement.querySelector('[data-tone="healthy"]')).toBeTruthy();
  });
});
