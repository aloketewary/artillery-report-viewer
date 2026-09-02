import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxEchartsModule } from 'ngx-echarts';
import { ReqLoadComponent } from './req-load.component';

describe('ReqLoadComponent', () => {
  let component: ReqLoadComponent;
  let fixture: ComponentFixture<ReqLoadComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        NgxEchartsModule.forRoot({ echarts: () => import('echarts') }),
      ],
      declarations: [ReqLoadComponent],
    });
    fixture = TestBed.createComponent(ReqLoadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
