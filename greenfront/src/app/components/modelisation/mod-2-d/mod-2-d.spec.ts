import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Mod2D } from './mod-2-d';

describe('Mod2D', () => {
  let component: Mod2D;
  let fixture: ComponentFixture<Mod2D>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Mod2D]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Mod2D);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
