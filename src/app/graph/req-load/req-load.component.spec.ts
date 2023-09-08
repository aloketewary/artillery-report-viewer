import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReqLoadComponent } from './req-load.component';

describe('ReqLoadComponent', () => {
  let component: ReqLoadComponent;
  let fixture: ComponentFixture<ReqLoadComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ReqLoadComponent]
    });
    fixture = TestBed.createComponent(ReqLoadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
