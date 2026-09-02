import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TuiButton } from '@taiga-ui/core';
import { InfoComponent } from './info.component';

describe('InfoComponent', () => {
  let component: InfoComponent;
  let fixture: ComponentFixture<InfoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TuiButton],
      declarations: [InfoComponent],
    });
    fixture = TestBed.createComponent(InfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
