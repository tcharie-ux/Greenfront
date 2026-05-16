import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Estimation } from './estimation';

describe('Estimation', () => {
  let component: Estimation;
  let fixture: ComponentFixture<Estimation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Estimation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Estimation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
