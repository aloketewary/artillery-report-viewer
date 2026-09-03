import {ComponentFixture, TestBed} from '@angular/core/testing';
import type {MetricCard} from '../home/home.component';
import {KpiGridComponent} from './kpi-grid.component';

describe('KpiGridComponent', () => {
  let component: KpiGridComponent;
  let fixture: ComponentFixture<KpiGridComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [KpiGridComponent],
    });
    fixture = TestBed.createComponent(KpiGridComponent);
    component = fixture.componentInstance;
  });

  function metric(key: MetricCard['key'], label: string, value: string, availability: MetricCard['availability'] = 'measured'): MetricCard {
    return {
      key,
      label,
      value,
      detail: `${label} context`,
      trend: 'No baseline',
      tone: 'neutral',
      availability,
      bars: [],
    };
  }

  it('renders exactly six KPI cards in the fixed report order', () => {
    component.metrics = [
      metric('duration', 'Duration', '4s'),
      metric('p99', 'P99 Latency', '250 ms'),
      metric('requests', 'Requests', '120'),
      metric('errorRate', 'Error Rate', '0.00%'),
      metric('p95', 'P95 Latency', '180 ms'),
      metric('throughput', 'Throughput', '30.0'),
    ];
    fixture.detectChanges();

    const cards = Array.from(fixture.nativeElement.querySelectorAll('.metric-card')) as HTMLElement[];
    expect(cards.length).toBe(6);
    expect(cards.map((card) => card.querySelector('.metric-topline span')?.textContent?.trim())).toEqual([
      'Requests',
      'Throughput',
      'Error Rate',
      'P95 Latency',
      'P99 Latency',
      'Duration',
    ]);
  });

  it('marks unavailable values and does not render fabricated trend or threshold copy', () => {
    component.metrics = [metric('requests', 'Requests', 'N/A', 'unavailable')];
    fixture.detectChanges();

    const cards = Array.from(fixture.nativeElement.querySelectorAll('.metric-card')) as HTMLElement[];
    expect(cards.length).toBe(6);
    expect(cards[0].getAttribute('data-availability')).toBe('unavailable');
    expect(cards[0].querySelector('.metric-status')?.textContent?.trim()).toBe('Unavailable');
    expect(fixture.nativeElement.textContent).not.toContain('No baseline');
    expect(fixture.nativeElement.textContent).not.toContain('Target');
  });
});
