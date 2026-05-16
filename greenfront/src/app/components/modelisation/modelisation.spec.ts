import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Modelisation } from './modelisation';

describe('Modelisation', () => {
  let component: Modelisation;
  let fixture: ComponentFixture<Modelisation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Modelisation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Modelisation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
