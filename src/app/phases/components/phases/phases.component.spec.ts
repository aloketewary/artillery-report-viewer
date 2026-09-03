import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhasesComponent } from './phases.component';

describe('PhasesComponent', () => {
  let component: PhasesComponent;
  let fixture: ComponentFixture<PhasesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PhasesComponent]
    });
    fixture = TestBed.createComponent(PhasesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
