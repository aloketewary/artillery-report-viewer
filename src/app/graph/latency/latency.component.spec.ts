import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LatencyComponent } from './latency.component';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';

describe('LatencyComponent', () => {
  let component: LatencyComponent;
  let fixture: ComponentFixture<LatencyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports:[
        MatCardModule,
        MatIconModule,
        MatDividerModule,
        MatSnackBarModule,
        MatToolbarModule
      ],
      declarations: [LatencyComponent]
    });
    fixture = TestBed.createComponent(LatencyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
