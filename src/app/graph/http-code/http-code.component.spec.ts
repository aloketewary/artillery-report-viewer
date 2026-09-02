import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxEchartsModule } from 'ngx-echarts';
import { HttpCodeComponent } from './http-code.component';

describe('HttpCodeComponent', () => {
  let component: HttpCodeComponent;
  let fixture: ComponentFixture<HttpCodeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NgxEchartsModule.forRoot({ echarts: () => import('echarts') })],
      declarations: [HttpCodeComponent],
    });
    fixture = TestBed.createComponent(HttpCodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
