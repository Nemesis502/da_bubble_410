import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

import { MessageTemplateComponent } from '../message-template/message-template.component';
import { EmojiPickerComponent } from '../emoji-picker/emoji-picker.component';
import { ChatService } from '../../shared/services/chat.service';
import { ThreadUIService } from '../../shared/services/thread-ui.service';
import { SessionService } from '../../shared/services/currentUserSession.service';
import { appUser } from '../../interfaces/user.interface';

@Component({
  selector: 'app-threads',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatCardModule,
    MessageTemplateComponent,
    EmojiPickerComponent,
  ],
  templateUrl: './threads.component.html',
  styleUrls: [
    './threads.component.scss',
    './threads.media-querry.component.scss',
  ],
})
export class ThreadsComponent implements OnInit, OnChanges {
  @Input() threadId!: string | null;
  @Output() threadClosed = new EventEmitter<void>();

  private chatService = inject(ChatService);
  private threadUIService = inject(ThreadUIService);
  private userSession = inject(SessionService);
  private elementRef = inject(ElementRef);

  @ViewChild('chatFieldThread') chatFieldRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('chatBody') chatBodyRef!: ElementRef;

  currentUser: appUser | null = null;
  selectedChannel: any = null;
  editedMessage: any = null;
  chatMessage = '';
  activeThreadMessage: any | null = null;
  threadMessages: any[] = [];

  mentionPopupVisible = false;
  hashtagPopupVisible = false;
  filteredMentionableUsers: any[] = [];
  filteredChannels: any[] = [];
  emojiPickerVisible = false;
  pickerPosition = { top: 0, left: 0 };

  async ngOnInit(): Promise<void> {
    this.currentUser = this.userSession.getCurrentUser();
    this.chatService.selectedChannel$.subscribe((channel) => {
      this.selectedChannel = channel;
      this.threadUIService.fetchMentionableUsers(channel?.channelId);
      this.threadUIService.fetchAllChannels();
      if (channel && this.threadId) {
        this.loadThreadData();
      }
    });
    this.chatService.activeThreadMessage$.subscribe((msg) => {
      this.activeThreadMessage = msg;
    });
    this.chatService.threadMessages$.subscribe((msgs) => {
      this.threadMessages = msgs ?? [];
    });
    this.threadUIService.mentionPopupVisible$.subscribe(
      (v) => (this.mentionPopupVisible = v)
    );
    this.threadUIService.hashtagPopupVisible$.subscribe(
      (v) => (this.hashtagPopupVisible = v)
    );
    this.threadUIService.filteredMentionableUsers$.subscribe(
      (v) => (this.filteredMentionableUsers = v)
    );
    this.threadUIService.filteredChannels$.subscribe(
      (v) => (this.filteredChannels = v)
    );
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['threadId'] && this.threadId) {
      if (this.selectedChannel?.channelId) {
        this.loadThreadData();
      }
    }
  }

  ngAfterViewInit() {
    this.threadUIService.init(
      this.chatFieldRef,
      this.elementRef,
      () => this.chatMessage,
      (msg) => (this.chatMessage = msg)
    );

    this.threadUIService.setChatContext(
      this.chatFieldRef,
      () => this.chatMessage,
      (msg) => (this.chatMessage = msg)
    );
  }

  private async loadThreadData(): Promise<void> {
    if (!this.threadId || !this.selectedChannel?.channelId) {
      return;
    }
    try {
      this.chatService.activeThreadMessageId = this.threadId;

      await this.chatService.setActiveThreadMessage(
        this.selectedChannel.channelId,
        this.threadId
      );

      this.chatService.loadThreadMessages(
        this.selectedChannel.channelId,
        this.threadId
      );
    } catch (error) {
    }
  }

  async sendMessage(): Promise<void> {
    const messageText = this.chatMessage.trim();
    if (
      !messageText ||
      !this.selectedChannel?.channelId ||
      !this.currentUser?.id
    ) {
      return;
    }

    const chatContext = {
      isConversation: this.chatService.isConversation,
      isThread: true,
      activeThreadMessageId: this.threadId || '',
      editedMessage: this.editedMessage,
    };

    await this.chatService.sendMessage(
      this.selectedChannel.channelId,
      messageText,
      this.currentUser.id,
      chatContext
    );

    this.chatMessage = '';
    this.editedMessage = null;
    this.scrollToBottom();
  }

  startEditingMessage(message: any): void {
    this.chatMessage = message.text;
    this.editedMessage = message;
    this.focusChatInput();
  }

  stopEditing(): void {
    this.editedMessage = null;
    this.chatMessage = '';
    this.focusChatInput();
  }

  closeThreadView(): void {
    this.threadClosed.emit();
  }

  async checkMentionTriggerThread(event: KeyboardEvent): Promise<void> {
    this.threadUIService.handleChatInput(
      event,
      this.chatMessage,
      this.selectedChannel?.channelId
    );
  }

  selectMentionUser(userName: string): void {
    this.threadUIService.selectMentionUser(userName);
    this.focusChatInput();
  }

  selectHashtagChannel(channelName: string): void {
    this.threadUIService.selectHashtagChannel(channelName);
    this.focusChatInput();
  }

  toggleEmojiPicker(event: MouseEvent): void {
    this.threadUIService.toggleEmojiPicker(event);
  }

  addEmoji(emoji: string): void {
    this.threadUIService.addEmoji(emoji);
    this.focusChatInput();
  }

  onPickerClosed(): void {
    this.threadUIService.onPickerClosed();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    this.threadUIService.onDocumentClick(event);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.chatBodyRef) {
        const container = this.chatBodyRef.nativeElement;
        container.scrollTop = container.scrollHeight;
      }
    }, 0);
  }

  private focusChatInput(): void {
    if (this.chatFieldRef) {
      this.chatFieldRef.nativeElement.focus();
    }
  }

  triggerMention(): void {
    this.threadUIService.triggerMention(this.selectedChannel?.channelId);
  }

  setActiveChatField() {
    this.threadUIService.setChatContext(
      this.chatFieldRef,
      () => this.chatMessage,
      (msg) => (this.chatMessage = msg)
    );
  }
}
