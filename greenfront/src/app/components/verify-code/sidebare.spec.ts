import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Sidebare } from './sidebare';

describe('Sidebare', () => {
  let component: Sidebare;
  let fixture: ComponentFixture<Sidebare>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Sidebare]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Sidebare);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
