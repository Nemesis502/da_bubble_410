import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatTemplateComponent } from './chat-template.component';

describe('ChatTemplateComponent', () => {
  let component: ChatTemplateComponent;
  let fixture: ComponentFixture<ChatTemplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatTemplateComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChatTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
