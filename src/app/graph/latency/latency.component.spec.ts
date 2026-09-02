import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxEchartsModule } from 'ngx-echarts';
import { LatencyComponent } from './latency.component';

describe('LatencyComponent', () => {
  let component: LatencyComponent;
  let fixture: ComponentFixture<LatencyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NgxEchartsModule.forRoot({ echarts: () => import('echarts') })],
      declarations: [LatencyComponent],
    });
    fixture = TestBed.createComponent(LatencyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
