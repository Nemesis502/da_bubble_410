import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatTemplateContainerComponent } from './chat-template-container.component';

describe('ChatTemplateContainerComponent', () => {
  let component: ChatTemplateContainerComponent;
  let fixture: ComponentFixture<ChatTemplateContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatTemplateContainerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChatTemplateContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
