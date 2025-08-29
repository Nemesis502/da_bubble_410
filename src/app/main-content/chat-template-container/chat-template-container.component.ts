import { Component, OnInit, HostListener } from '@angular/core';
import { ChatService } from '../../shared/services/chat.service';
import { Observable } from 'rxjs';
import { ChatTemplateComponent } from '../chat-template/chat-template.component';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-chat-template-container',
  standalone: true,
  template: `
    <app-chat-template
      [chatId]="chatId"
      [threadId]="activeThreadMessageId"
      (threadOpened)="onOpenThread($event)"
      (threadClosed)="activeThreadMessageId = null"
    ></app-chat-template>
  `,
  styleUrls: ['./chat-template-container.component.scss'],
  imports: [ChatTemplateComponent, CommonModule],
})
export class ChatTemplateContainerComponent implements OnInit {
  isMobile: boolean = window.innerWidth < 999;
  threadIsOpen$: Observable<boolean>;
  activeThreadMessageId: string | null = null;
  chatId: string | null = null;

  constructor(
    private chatService: ChatService,
    private route: ActivatedRoute
  ) {
    this.threadIsOpen$ = this.chatService.isThread$;
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobile = window.innerWidth < 999;
  }

  ngOnInit(): void {
    this.onResize();

    this.route.paramMap.subscribe((params) => {
      this.chatId = params.get('id');
    });

    this.chatService.activeThreadMessage$.subscribe((msg) => {
      this.activeThreadMessageId = msg?.id ?? null;
    });
  }

  onOpenThread(messageId: string): void {
    this.activeThreadMessageId = messageId;
    if (!this.isMobile) {
      this.chatService.openThread(messageId, false);
    }
  }
}
