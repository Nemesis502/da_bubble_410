import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  NgZone,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageTemplateComponent } from '../message-template/message-template.component';
import { EmojiPickerComponent } from '../emoji-picker/emoji-picker.component';
import { ChannelInfoComponent } from '../channel-info/channel-info.component';
import { ChatService } from '../../shared/services/chat.service';
import { ChatUIService } from '../../shared/services/chat-ui.service';
import { SessionService } from '../../shared/services/currentUserSession.service';
import { FirestoreService } from '../../shared/services/firestore.service';
import { appUser } from '../../interfaces/user.interface';
import { Channel } from '../../interfaces/channel.interface';
import { ChatActionsService } from '../../shared/services/chat-action.service';
import { ChatGuestService } from '../../shared/services/chat-guest.service';
import { ChatSubscriptionsService } from '../../shared/services/chat-subscription.service';

interface PickerPosition {
  top: number;
  left: number;
}

@Component({
  selector: 'app-chat-template',
  standalone: true,
  imports: [
    FormsModule,
    MatIconModule,
    MatCardModule,
    CommonModule,
    MessageTemplateComponent,
    EmojiPickerComponent,
    ChannelInfoComponent,
  ],
  templateUrl: './chat-template.component.html',
  styleUrls: [
    './chat-template.component.scss',
    './chat-template.media-query.component.scss',
    './chat-template.mention.component.scss',
  ],
})
export class ChatTemplateComponent implements AfterViewInit, OnInit {
  // ----------------------- Inputs & Outputs -----------------------
  @Input() isThreadView = false;
  @Input() chatId!: string | null;
  @Input() threadId!: string | null;
  @Input() chatType: 'channel' | 'conversation' | null = null;
  @Output() threadOpened = new EventEmitter<string>();
  @Output() threadClosed = new EventEmitter<void>();
  @Output() channelLeft = new EventEmitter<void>();
  // ----------------------- Injected Services -----------------------
  private userSession = inject(SessionService);
  private chatService = inject(ChatService);
  private chatUIService = inject(ChatUIService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private chatActions = inject(ChatActionsService);
  private guestService = inject(ChatGuestService);
  private subscriptionsService = inject(ChatSubscriptionsService);

  @ViewChild('chatField') chatFieldRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('chatBody') private chatBodyRef!: ElementRef;

  // ----------------------- Component State -----------------------
  currentUser: appUser | null = this.userSession.getCurrentUser();
  otherUser: appUser | null = null;
  selectedChannel: any = null;
  chatMessage = '';
  editedMessage: any = null;
  threadMessages: any[] = [];
  activeThreadMessage: any | null = null;
  messages: any[] = [];
  members: any[] = [];
  isChannelInfoOpen = false;
  isMobile = false;
  chatIsThread = false;
  chatIsChannel = false;
  chatIsConversation = false;
  width = window.innerWidth;
  isGuestChat = false;
  mentionPopupVisible = false;
  hashtagPopupVisible = false;
  filteredMentionableUsers: any[] = [];
  filteredChannels: any[] = [];
  emojiPickerVisible = false;
  pickerPosition: PickerPosition = { top: 0, left: 0 };

  constructor(
    private firestoreService: FirestoreService,
    private hostEl: ElementRef
  ) {}

  // ----------------------- Lifecycle Hooks -----------------------
  // Initialize chat input, context, and chat body scroll
  ngAfterViewInit() {
    this.chatUIService.init(
      this.chatFieldRef,
      this.hostEl,
      () => this.chatMessage,
      (m) => (this.chatMessage = m)
    );
    this.chatUIService.setChatContext(
      this.chatFieldRef,
      () => this.chatMessage,
      (msg) => (this.chatMessage = msg)
    );
    this.chatUIService.setChatBodyRef(this.chatBodyRef);
  }

  // Initialize current user, detect screen, setup subscriptions
  async ngOnInit() {
    this.updateIsMobile();
    await this.initializeChatType();
    this.setupGuestSubscriptions();
    await this.initializeChatBasedOnThreadOrChatId();
    this.fetchChannelMembers();
    this.subscriptionsService.subscribeAll({
      onMessages: (msgs) => (this.messages = msgs),
      onThreadMessages: (msgs) => (this.threadMessages = msgs),
      onSelectedChannel: (c) => (this.selectedChannel = c),
      onOtherUser: (u) => (this.otherUser = u),
      onActiveThreadMessage: (msg) => {
        if (this.isMobile) {
          this.chatIsThread = !!msg;
          this.activeThreadMessage = msg;
        } else {
          this.chatIsThread = false;
          this.activeThreadMessage = null;
        }
      },
      onMentionPopupVisible: (val) => (this.mentionPopupVisible = val),
      onHashtagPopupVisible: (val) => (this.hashtagPopupVisible = val),
      onFilteredMentionableUsers: (val) =>
        (this.filteredMentionableUsers = val),
      onFilteredChannels: (val) => (this.filteredChannels = val),
      onEmojiPickerVisible: (val) => (this.emojiPickerVisible = val),
      onPickerPosition: (val) => (this.pickerPosition = val),
    });
    this.userSession.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });
    this.chatUIService.fetchAllChannels();
    setTimeout(() => {
      this.scrollToBottom();
    }, 500);
  }

  // ----------------------- Helper Methods -----------------------

  /** Initialize current user and check if screen is mobile */
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.updateIsMobile();
  }

  private updateIsMobile() {
    this.isMobile = window.innerWidth < 999;
  }

  // Handle @Input changes for chatId or chatType
  async ngOnChanges(changes: SimpleChanges) {
    this.fetchChannelMembers();

    if (changes['chatId'] && this.chatId) {
      await this.initializeChatBasedOnThreadOrChatId();
    }

    if (changes['chatType'] && this.chatType) {
      await this.initializeChatType();
    }

    setTimeout(() => {
      this.scrollToBottom();
    }, 500);
  }

  // ----------------------- Initialization Helpers -----------------------
  // Determine chat type (channel or conversation) from input or route
  private async initializeChatType(): Promise<void> {
    const type = this.chatType ?? this.route.snapshot.paramMap.get('type');
    this.chatIsChannel = type === 'channel';
    this.chatIsConversation = type === 'conversation';
  }

  // Initialize chat data based on threadId or chatId
  private async initializeChatBasedOnThreadOrChatId(): Promise<void> {
    const id = this.threadId ?? this.chatId;
    if (!id || !this.currentUser) return;
    this.isThreadView = !!this.threadId;
    if (this.currentUser.id === 'Guest') {
      this.setupGuestSubscriptions();
    }
    await this.chatService.initializeChat(id, this.currentUser.id);
  }

  // ----------------------- Guest Subscriptions -----------------------
  // Setup guest direct messages and guest channels subscriptions
  private setupGuestSubscriptions(): void {
    if (!this.isMobile) this.subscribeToGuestDirectMessages();
    this.subscribeToGuestChannels();
  }

  // Subscribe to guest direct messages
  private subscribeToGuestDirectMessages(): void {
    this.guestService.subscribeToGuestDirectMessages((user, isConversation) => {
      this.setGuestDirectMessageState(user, isConversation);
    });
  }

  // Subscribe to guest channels
  private subscribeToGuestChannels(): void {
    this.guestService.subscribeToGuestChannels(async (channel) => {
      if (!channel.channelId || !this.currentUser?.id) return;
      await this.setGuestChannelState(channel);
    });
  }

  // Update component state when a guest direct message is selected
  private setGuestDirectMessageState(user: appUser, isConversation: boolean) {
    this.otherUser = user;
    this.isGuestChat = true;
    this.selectedChannel = null;
    this.messages = [];
    this.chatIsConversation = isConversation;
    this.chatIsChannel = !isConversation;
    this.scrollToBottom();
  }

  // Update component state when a guest channel is selected
  private async setGuestChannelState(channel: Channel) {
    this.otherUser = null;
    this.chatIsConversation = false;
    this.chatIsThread = false;
    this.selectedChannel = channel;
    await this.chatService.initializeChat(
      channel.channelId!,
      this.currentUser!.id
    );
    const guestMembers = this.guestService.mapChannelMembers(channel);
    const existingMemberIds = new Set(this.members.map((m) => m.id));
    this.members = [
      ...this.members.filter((m) => existingMemberIds.has(m.id)),
      ...guestMembers.filter((m) => !existingMemberIds.has(m.id)),
    ];
    this.chatIsChannel = true;
    this.scrollToBottom();
  }

  // ----------------------- Message Handling -----------------------

  /** Sends a chat message with context (thread, conversation, edited) */
  async sendMessage(): Promise<void> {
    const messageText = this.chatMessage.trim();
    if (!messageText) return;
    if (this.isGuestChat) {
      await this.handleGuestMessage(messageText);
      return;
    }
    await this.chatActions.sendMessage(
      this.chatMessage,
      this.selectedChannel,
      this.currentUser!,
      this.editedMessage,
      this.isThreadView
    );
    const reset = this.chatActions.resetChatInput(
      this.chatMessage,
      this.editedMessage
    );
    this.chatMessage = reset.chatMessage;
    this.editedMessage = reset.editedMessage;
  }

  /** Sends a chat message with context if User is Guest-User (thread, conversation, edited) */
  private async handleGuestMessage(messageText: string): Promise<void> {
    if (this.chatIsConversation) {
      const tempMessage = {
        id: `guest-${Date.now()}`,
        text: messageText,
        senderID: 'Guest',
        timestamp: new Date().toISOString(),
        pending: false,
      };
      this.messages = [...this.messages, tempMessage];
      this.scrollToBottom();
    } else if (this.chatIsChannel && this.selectedChannel) {
      await this.guestService.sendGuestChannelMessage(
        this.selectedChannel.channelId,
        messageText
      );
    }
    this.chatMessage = '';
    this.editedMessage = null;
  }

  /** Begins editing a message */
  startEditingMessage(message: any): void {
    this.editedMessage = this.chatActions.startEditingMessage(
      this.chatMessage,
      message
    );
    this.chatMessage = message.text;
  }

  /** Stops editing a message */
  stopEditing(): void {
    this.editedMessage = this.chatActions.stopEditing();
    this.chatMessage = '';
  }

  // ----------------------- Thread Handling -----------------------

  /** Handles reply to a message, opens thread if mobile or emits event */
  handleReplyToMessage(messageId: string): void {
    if (!this.isMobile) {
      this.threadOpened.emit(messageId);
    } else {
      this.chatIsChannel = false;
      this.chatService.openThread(messageId);
      this.scrollToBottom();
    }
  }

  /** Closes thread view depending on screen type */
  closeThreadView(): void {
    this.initializeChatType();
    if (this.isMobile) {
      this.chatService.closeThread();
      this.isThreadView = false;
      this.scrollToBottom();
    } else {
      this.threadClosed.emit();
    }
  }
  // ----------------------- Navigation & Dialogs -----------------------

  /** Navigates to the main menu */
  navigateToMain(): void {
    this.router.navigate(['/main-menu']);
    this.closeThreadView();
  }

  /** Opens the main menu dialog */
  openMenuDialog(): void {
    this.chatUIService.openMenuDialog();
  }

  /** Opens dialog to view channel members */
  openMemberDialog(): void {
    this.chatUIService.openMemberDialog(this.selectedChannel?.channelId);
  }

  /** Opens dialog to add people to channel */
  openAddPeopleDialog(): void {
    this.chatUIService.openAddPeopleDialog(this.selectedChannel?.channelId);
  }

  /** Opens profile dialog for other user */
  openProfileDialogOtherUser(): void {
    this.chatUIService.openProfileDialog(this.otherUser, this.currentUser?.id);
  }

  /** Opens channel info panel */
  openChannelInfo(): void {
    this.isChannelInfoOpen = true;
  }

  updateChannelName(newName: string) {
    if (this.selectedChannel) {
      this.selectedChannel.name = newName;
    }
  }
  // ----------------------- Mentions & Hashtags -----------------------

  /** Checks if a mention should be triggered based on keyboard input */
  async checkMentionTrigger(event: KeyboardEvent): Promise<void> {
    this.chatUIService.handleChatInput(
      event,
      this.chatMessage,
      this.selectedChannel?.channelId
    );
  }

  /** Selects a user from the mention popup */
  selectMentionUser(userName: string): void {
    this.chatUIService.selectMentionUser(userName);
    this.chatUIService.focusChatInput();
  }

  /** Selects a channel from hashtag suggestions */
  selectHashtagChannel(channelName: string): void {
    this.chatUIService.selectHashtagChannel(channelName);
    this.chatUIService.focusChatInput();
  }

  /** Triggers mention manually */
  triggerMention(): void {
    this.chatUIService.triggerMention(this.selectedChannel?.channelId);
  }
  // ----------------------- Emoji Picker -----------------------

  /** Toggles the emoji picker visibility */
  toggleEmojiPicker(event: MouseEvent): void {
    this.chatUIService.toggleEmojiPicker(event);
  }

  /** Adds selected emoji to the chat input */
  addEmoji(emoji: string): void {
    this.chatUIService.addEmoji(emoji);
    this.chatUIService.focusChatInput();
  }

  /** Called when emoji picker is closed */
  onPickerClosed(): void {
    this.chatUIService.onPickerClosed();
  }
  // ----------------------- Document Events -----------------------

  /** Handles document click events for closing popups */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    this.chatUIService.onDocumentClick(event);
  }

  /** Fetches channel members from Firestore */
  private fetchChannelMembers() {
    if (this.chatId) {
      this.firestoreService
        .getChannelMembers(this.chatId)
        .subscribe((memberIds) => {
          this.firestoreService.getUsersByIds(memberIds).subscribe((users) => {
            this.members = users;
          });
        });
    }
  }

  /** Sets the active chat field context for ChatUIService */
  setActiveChatField() {
    this.chatUIService.setChatContext(
      this.chatFieldRef,
      () => this.chatMessage,
      (msg) => (this.chatMessage = msg)
    );
  }

  /**
   * Scrolls the chat container to the bottom.
   * Ensures the latest messages are visible and focuses the input.
   */
  scrollToBottom(): void {
    if (!this.chatBodyRef) return;
    requestAnimationFrame(() => {
      const container = this.chatBodyRef.nativeElement;
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      this.focusChatInput();
    });
  }

  /**
   * Focuses the chat input field.
   * Useful after scrolling or inserting emojis/mentions.
   */
  focusChatInput() {
    if (this.chatFieldRef) this.chatFieldRef.nativeElement.focus();
  }

  onChannelLeft(): void {
    this.channelLeft.emit();
  }
}
