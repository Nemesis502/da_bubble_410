
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
import { ChatUIService } from '../../shared/services/chat-ui.service';
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
  styleUrls: ['./threads.component.scss'],
})
export class ThreadsComponent implements OnInit, OnChanges {
  @Input() threadId!: string | null;
  @Output() threadClosed = new EventEmitter<void>();

  private chatService = inject(ChatService);
  private chatUIService = inject(ChatUIService);
  private userSession = inject(SessionService);
  private elementRef = inject(ElementRef);

  @ViewChild('chatField') chatField!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('chatBody') chatBodyRef!: ElementRef;

  currentUser: appUser | null = null;
  selectedChannel: any = null;
  editedMessage: any = null;
  chatMessage = '';
  activeThreadMessage: any | null = null; // Initialize as null
  threadMessages: any[] = [];

  mentionPopupVisible = false;
  hashtagPopupVisible = false;
  filteredMentionableUsers: any[] = [];
  filteredChannels: any[] = [];
  emojiPickerVisible = false;
  pickerPosition = { top: 0, left: 0 };

  async ngOnInit(): Promise<void> {
    this.currentUser = this.userSession.getCurrentUser();

    // Subscribe to selected channel
    this.chatService.selectedChannel$.subscribe((channel) => {
      this.selectedChannel = channel;
      this.chatUIService.fetchMentionableUsers(channel?.channelId);
      this.chatUIService.fetchAllChannels();
      
      // If we have both channel and threadId, load the thread data
      if (channel && this.threadId) {
        this.loadThreadData();
      }
    });

    // Subscribe to active thread message
    this.chatService.activeThreadMessage$.subscribe((msg) => {
      this.activeThreadMessage = msg;
      console.log('Active thread message updated:', this.activeThreadMessage);
    });

    // Subscribe to thread messages
    this.chatService.threadMessages$.subscribe((msgs) => {
      this.threadMessages = msgs ?? [];
      console.log('Thread messages updated:', this.threadMessages);
    });

    // UI Service subscriptions
    this.chatUIService.mentionPopupVisible$.subscribe(
      (v) => (this.mentionPopupVisible = v)
    );
    this.chatUIService.hashtagPopupVisible$.subscribe(
      (v) => (this.hashtagPopupVisible = v)
    );
    this.chatUIService.filteredMentionableUsers$.subscribe(
      (v) => (this.filteredMentionableUsers = v)
    );
    this.chatUIService.filteredChannels$.subscribe(
      (v) => (this.filteredChannels = v)
    );

    console.log('ThreadsComponent initialized with threadId:', this.threadId);
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['threadId'] && this.threadId) {
      console.log('Thread ID changed to:', this.threadId);
      
      // If we have the selected channel, load the thread data immediately
      if (this.selectedChannel?.channelId) {
        this.loadThreadData();
      }
    }
  }

  private async loadThreadData(): Promise<void> {
    if (!this.threadId || !this.selectedChannel?.channelId) {
      console.warn('Cannot load thread data: missing threadId or channelId');
      return;
    }

    console.log('Loading thread data for:', {
      threadId: this.threadId,
      channelId: this.selectedChannel.channelId
    });

    try {
      // Set the active thread message ID in the service
      this.chatService.activeThreadMessageId = this.threadId;
      
      // Load the parent message (activeThreadMessage)
      await this.chatService.setActiveThreadMessage(
        this.selectedChannel.channelId, 
        this.threadId
      );
      
      // Load the thread replies
      this.chatService.loadThreadMessages(
        this.selectedChannel.channelId, 
        this.threadId
      );
    } catch (error) {
      console.error('Error loading thread data:', error);
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

  closeThreadView(): void {
    this.threadClosed.emit();
  }

  async checkMentionTrigger(event: KeyboardEvent): Promise<void> {
    this.chatUIService.handleChatInput(
      event,
      this.chatMessage,
      this.selectedChannel?.channelId
    );
  }

  selectMentionUser(userName: string): void {
    this.chatUIService.selectMentionUser(userName);
    this.focusChatInput();
  }

  selectHashtagChannel(channelName: string): void {
    this.chatUIService.selectHashtagChannel(channelName);
    this.focusChatInput();
  }

  toggleEmojiPicker(event: MouseEvent): void {
    this.chatUIService.toggleEmojiPicker(event);
  }

  addEmoji(emoji: string): void {
    this.chatUIService.addEmoji(emoji);
    this.focusChatInput();
  }

  onPickerClosed(): void {
    this.chatUIService.onPickerClosed();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    this.chatUIService.onDocumentClick(event);
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
    if (this.chatField) {
      this.chatField.nativeElement.focus();
    }
  }

  triggerMention(): void {
    this.chatUIService.triggerMention(this.selectedChannel?.channelId);
  }
}

