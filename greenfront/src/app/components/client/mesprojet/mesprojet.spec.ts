import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Mesprojet } from './mesprojet';

describe('Mesprojet', () => {
  let component: Mesprojet;
  let fixture: ComponentFixture<Mesprojet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Mesprojet]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Mesprojet);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
