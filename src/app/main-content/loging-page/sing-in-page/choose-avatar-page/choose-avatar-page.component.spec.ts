import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChooseAvatarPageComponent } from './choose-avatar-page.component';

describe('ChooseAvatarPageComponent', () => {
  let component: ChooseAvatarPageComponent;
  let fixture: ComponentFixture<ChooseAvatarPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChooseAvatarPageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChooseAvatarPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
