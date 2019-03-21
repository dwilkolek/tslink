import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InOutCounterComponent } from './in-out-counter.component';

describe('InOutCounterComponent', () => {
  let component: InOutCounterComponent;
  let fixture: ComponentFixture<InOutCounterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InOutCounterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InOutCounterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
