import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Createprojetform } from './createprojetform';

describe('Createprojetform', () => {
  let component: Createprojetform;
  let fixture: ComponentFixture<Createprojetform>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Createprojetform]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Createprojetform);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
