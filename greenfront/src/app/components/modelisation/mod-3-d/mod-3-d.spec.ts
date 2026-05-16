import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Mod3D } from './mod-3-d';

describe('Mod3D', () => {
  let component: Mod3D;
  let fixture: ComponentFixture<Mod3D>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Mod3D]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Mod3D);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
