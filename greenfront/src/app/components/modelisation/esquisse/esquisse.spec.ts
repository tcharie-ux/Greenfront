import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Esquisse } from './esquisse';

describe('Esquisse', () => {
  let component: Esquisse;
  let fixture: ComponentFixture<Esquisse>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Esquisse]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Esquisse);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
