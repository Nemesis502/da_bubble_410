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
    this.initChannelSubscription();
    this.initMessageSubscriptions();
    this.initUIPopupSubscriptions();
  }

  /** Handles channel selection changes */
  private initChannelSubscription(): void {
    this.chatService.selectedChannel$.subscribe((channel) => {
      this.selectedChannel = channel;
      this.threadUIService.fetchMentionableUsers(channel?.channelId);
      this.threadUIService.fetchAllChannels();
      if (channel && this.threadId) this.loadThreadData();
    });
  }

  /** Handles message + thread updates */
  private initMessageSubscriptions(): void {
    this.chatService.activeThreadMessage$.subscribe(
      (msg) => (this.activeThreadMessage = msg)
    );
    this.chatService.threadMessages$.subscribe(
      (msgs) => (this.threadMessages = msgs ?? [])
    );
  }

  /** Handles UI popup/mention/filter updates */
  private initUIPopupSubscriptions(): void {
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


  /**
   * Reacts to @Input changes (e.g., when a new threadId is passed in).
   */
  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['threadId'] && this.threadId) {
      if (this.selectedChannel?.channelId) {
        this.loadThreadData();
      }
    }
  }

  /**
   * Runs after view is initialized; sets up chat context in UI service.
   */
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

  /**
   * Loads thread messages and sets active thread message in service.
   */
  private async loadThreadData(): Promise<void> {
    if (!this.threadId || !this.selectedChannel?.channelId) return;
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

  /**
   * Sends a new message in the thread (or edits an existing one).
   */
    async sendMessage(): Promise<void> {
    const text = this.chatMessage.trim();
    if (!text || !this.selectedChannel?.channelId || !this.currentUser?.id) return;

    await this.chatService.sendMessage(
      this.selectedChannel.channelId,
      text,
      this.currentUser.id,
      this.buildChatContext()
    );

    this.resetMessageInput();
  }

  /** Builds context object for sending a message */
  private buildChatContext() {
    return {
      isConversation: this.chatService.isConversation,
      isThread: true,
      activeThreadMessageId: this.threadId || '',
      editedMessage: this.editedMessage,
    };
  }

  /** Resets message input after sending */
  private resetMessageInput(): void {
    this.chatMessage = '';
    this.editedMessage = null;
    this.scrollToBottom();
  }

  /**
   * Prepares an existing message for editing.
   */
  startEditingMessage(message: any): void {
    this.chatMessage = message.text;
    this.editedMessage = message;
    this.focusChatInput();
  }

  /**
   * Cancels editing mode and resets the input field.
   */
  stopEditing(): void {
    this.editedMessage = null;
    this.chatMessage = '';
    this.focusChatInput();
  }

  /**
   * Emits event to close the thread view.
   */
  closeThreadView(): void {
    this.threadClosed.emit();
  }

  /**
   * Checks if user input triggers mention/hashtag popup.
   */
  async checkMentionTriggerThread(event: KeyboardEvent): Promise<void> {
    this.threadUIService.handleChatInput(
      event,
      this.chatMessage,
      this.selectedChannel?.channelId
    );
  }

  /**
   * Inserts selected @mention user into the message.
   */
  selectMentionUser(userName: string): void {
    this.threadUIService.selectMentionUser(userName);
    this.focusChatInput();
  }

  /**
   * Inserts selected #channel into the message.
   */
  selectHashtagChannel(channelName: string): void {
    this.threadUIService.selectHashtagChannel(channelName);
    this.focusChatInput();
  }

  /**
   * Toggles emoji picker popup.
   */
  toggleEmojiPicker(event: MouseEvent): void {
    this.threadUIService.toggleEmojiPicker(event);
  }

  /**
   * Adds selected emoji into the message.
   */
  addEmoji(emoji: string): void {
    this.threadUIService.addEmoji(emoji);
    this.focusChatInput();
  }

  /**
   * Handles emoji picker closed event.
   */
  onPickerClosed(): void {
    this.threadUIService.onPickerClosed();
  }

  /**
   * Closes popups when user clicks outside.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    this.threadUIService.onDocumentClick(event);
  }

  /**
   * Scrolls chat body to the bottom (after sending message).
   */
  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.chatBodyRef) {
        const container = this.chatBodyRef.nativeElement;
        container.scrollTop = container.scrollHeight;
      }
    }, 0);
  }

  /**
   * Focuses the chat input field.
   */
  private focusChatInput(): void {
    if (this.chatFieldRef) {
      this.chatFieldRef.nativeElement.focus();
    }
  }

  /**
   * Triggers mention popup programmatically.
   */
  triggerMention(): void {
    this.threadUIService.triggerMention(this.selectedChannel?.channelId);
  }

  /**
   * Updates chat field context in UI service.
   */
  setActiveChatField() {
    this.threadUIService.setChatContext(
      this.chatFieldRef,
      () => this.chatMessage,
      (msg) => (this.chatMessage = msg)
    );
  }
}
