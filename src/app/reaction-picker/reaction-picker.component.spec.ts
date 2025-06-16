import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReactionPickerComponent } from './reaction-picker.component';

describe('ReactionPickerComponent', () => {
  let component: ReactionPickerComponent;
  let fixture: ComponentFixture<ReactionPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactionPickerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReactionPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
