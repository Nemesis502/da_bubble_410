import { Component, OnInit, HostListener } from '@angular/core';
import { ChatService } from '../../shared/services/chat.service';
import { Observable } from 'rxjs';
import { ChatTemplateComponent } from '../chat-template/chat-template.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat-template-container',
  standalone: true,
  templateUrl: './chat-template-container.component.html',
  styleUrls: ['./chat-template-container.component.scss'],
  imports: [ChatTemplateComponent, CommonModule],
})
export class ChatTemplateContainerComponent implements OnInit {
  isMobile: boolean = window.innerWidth < 999;
  threadIsOpen$: Observable<boolean>;
  activeThreadMessageId: string | null = null;

  constructor(private chatService: ChatService) {
    this.threadIsOpen$ = this.chatService.isThread$;
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobile = window.innerWidth < 999;
  }

  ngOnInit(): void {
    this.onResize();

    // Subscribe to the active thread message from service so container keeps track
    this.chatService.activeThreadMessage$.subscribe((msg) => {
      this.activeThreadMessageId = msg?.id ?? null;
    });
  }

  // Called when main chat triggers opening a thread
  onOpenThread(messageId: string): void {
    this.activeThreadMessageId = messageId;
    // Also tell service to open thread view (non-mobile forces open here)
    if (!this.isMobile) {
      this.chatService.openThread(messageId, false);
    }
  }
}
