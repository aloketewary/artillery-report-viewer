import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TuiBadge } from '@taiga-ui/kit';
import { OverviewComponent } from './overview.component';
import { StarComponent } from '../../../shared/components/star/star.component';

describe('OverviewComponent', () => {
  let component: OverviewComponent;
  let fixture: ComponentFixture<OverviewComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TuiBadge],
      declarations: [OverviewComponent, StarComponent],
    });
    fixture = TestBed.createComponent(OverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
