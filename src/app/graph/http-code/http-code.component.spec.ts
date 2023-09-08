import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HttpCodeComponent } from './http-code.component';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';

describe('HttpCodeComponent', () => {
  let component: HttpCodeComponent;
  let fixture: ComponentFixture<HttpCodeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports:[
        MatCardModule,
        MatIconModule,
        MatDividerModule,
        MatSnackBarModule
      ],
      declarations: [HttpCodeComponent]
    });
    fixture = TestBed.createComponent(HttpCodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
