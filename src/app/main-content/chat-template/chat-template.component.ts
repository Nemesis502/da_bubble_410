import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
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
import { Observable, of } from 'rxjs';
import { MessageTemplateComponent } from '../message-template/message-template.component';
import { EmojiPickerComponent } from '../emoji-picker/emoji-picker.component';
import { ChannelInfoComponent } from '../channel-info/channel-info.component';
import { ChatService } from '../../shared/services/chat.service';
import { ChatUIService } from '../../shared/services/chat-ui.service';
import { SessionService } from '../../shared/services/currentUserSession.service';
import { appUser } from '../../interfaces/user.interface';
import { map, startWith } from 'rxjs/operators';
import { FirestoreService } from '../../shared/services/firestore.service';
import {
  ChannelsDirectMessageService,
  DirectMessage,
} from '../../shared/services/channels-direct-message.service';
import { Channel } from '../../interfaces/channel.interface';

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
    './chat-template.mention.component.scss'
  ],
})
export class ChatTemplateComponent implements AfterViewInit, OnInit {
  // ----------------------- Inputs & Outputs -----------------------
  @Input() isThreadView: boolean = false; // Whether the chat is showing a thread view
  @Input() chatId!: string | null; // ID of the current chat (channel or conversation)
  @Input() threadId!: string | null; // ID of the current thread
  @Input() chatType: 'channel' | 'conversation' | null = null; // Type of chat
  @Output() threadOpened = new EventEmitter<string>(); // Emits when a thread is opened
  @Output() threadClosed = new EventEmitter<void>(); // Emits when a thread is closed

  // ----------------------- Injected Services -----------------------
  private userSession = inject(SessionService); // Service for current user session
  private chatService = inject(ChatService); // Service handling chat operations
  private chatUIService = inject(ChatUIService); // Service handling UI interactions
  private router = inject(Router); // Angular Router
  private route = inject(ActivatedRoute); // Activated route for reading params
  private elementRef = inject(ElementRef); // Reference to host element

  // ----------------------- ViewChild Elements -----------------------
  @ViewChild('chatField') chatFieldRef!: ElementRef<HTMLTextAreaElement>; // Chat input field
  @ViewChild('chatBody') private chatBodyRef!: ElementRef; // Chat message container

  // ----------------------- Component State -----------------------
  currentUser: appUser | null = null; // The current logged-in user
  otherUser: appUser | null = null; // The other user in a conversation
  selectedChannel: any = null; // The selected channel object
  chatMessage: string = ''; // Current typed chat message
  editedMessage: any = null; // Message currently being edited
  threadMessages: any[] = []; // Messages in the active thread
  members: any[] = []; // Members of the current channel

  // ----------------------- Observables -----------------------
  messages$: Observable<any[]> = of([]); // Observable for main chat messages
  threadMessages$: Observable<any[] | null> = of(null); // Observable for thread messages
  activeThreadMessage: any | null = null; // Currently active thread message

  // ----------------------- UI State -----------------------
  mentionPopupVisible: boolean = false; // Whether the mention popup is visible
  hashtagPopupVisible: boolean = false; // Whether the hashtag popup is visible
  filteredMentionableUsers: any[] = []; // Filtered list of mentionable users
  filteredChannels: any[] = []; // Filtered list of channels for hashtag
  emojiPickerVisible: boolean = false; // Whether emoji picker is visible
  pickerPosition: PickerPosition = { top: 0, left: 0 }; // Position of the emoji picker
  isChannelInfoOpen: boolean = false; // Whether channel info panel is open
  isMobile: boolean = false; // Whether the device is mobile
  chatIsThread: boolean = false; // Whether current chat is a thread
  chatIsChannel: boolean = false; // Whether current chat is a channel
  chatIsConversation: boolean = false; // Whether current chat is a conversation
  messages: any[] = []; // Array of main chat messages
  width: number = window.innerWidth; // Current window width
  isGuestChat: boolean = false; // Whether current chat is with a guest user

  constructor(
    private firestoreService: FirestoreService,
    private hostEl: ElementRef,
    private channelDirectMessageData: ChannelsDirectMessageService,
  ) {}

  // ----------------------- Lifecycle Hooks -----------------------

  /** Initializes the component after view has been fully initialized */
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

  /** Initializes the component, sets up chat type, subscriptions, and fetches channels */
  async ngOnInit(): Promise<void> {
    this.initCurrentUserAndScreen();
    await this.initializeChatType();
    this.setupGuestSubscriptions();
    await this.initializeChatBasedOnThreadOrChatId();
    this.setupChatObservables();
    this.subscribeCommonObservables();
    this.chatUIService.fetchAllChannels();
  }

  /** Handles changes to @Input properties like chatId or chatType */
  async ngOnChanges(changes: SimpleChanges) {
    if (changes['chatId'] && this.chatId) {
      await this.ngOnInit();
      await this.chatService.initializeChat(this.chatId, this.currentUser?.id);
      this.messages$ = this.chatService.messages$;
      await this.fetchChannelMembers();
    }
    await this.ngOnInit();
    if (changes['chatType'] && this.chatType) {
      await this.ngOnInit();
      await this.initializeChatType();
    }
  }
  // ----------------------- Initialization Helpers -----------------------

  /** Sets current user and detects if screen is mobile */
  private initCurrentUserAndScreen(): void {
    this.currentUser = this.userSession.getCurrentUser();
    this.isMobile = this.width < 999;
  }

  /** Sets up subscriptions for guest chats and channels */
  private setupGuestSubscriptions(): void {
    if (!this.isMobile) this.subscribeToGuestDirectMessages();
    this.subscribeToGuestChannels();
  }

  /** Sets up observables depending on chat type (channel or conversation) */
  private setupChatObservables(): void {
    if (this.chatIsChannel) {
      this.setupMessagesObservable();
      this.subscribeToMessages();
      this.subscribeToSelectedChannel();
      this.subscribeToActiveThreadMessage();
      this.fetchChannelMembers();
    } else if (this.chatIsConversation) {
      this.setupMessagesObservable();
      this.subscribeToMessages();
      this.subscribeToOtherUser();
      this.subscribeToActiveThreadMessage();
      if (this.isMobile) this.subscribeToGuestDirectMessages();
    }
  }

  /** Subscribes to observables common to both chat types */
  private subscribeCommonObservables(): void {
    this.subscribeToThreadMessages();
    this.subscribeToThreadStatus();
    this.subscribeToChatUIObservables();
  }

  /** Initializes chat based on threadId or chatId */
  private async initializeChatBasedOnThreadOrChatId(): Promise<void> {
    const id = this.threadId ?? this.chatId;
    if (!id) return;
    this.isThreadView = !!this.threadId;
    await this.chatService.initializeChat(id, this.currentUser?.id);
  }

  /** Initializes chat type from @Input or route param */
  private async initializeChatType(): Promise<void> {
    const type = this.chatType ?? this.route.snapshot.paramMap.get('type');
    this.chatIsChannel = type === 'channel';
    this.chatIsConversation = type === 'conversation';
  }
  
  /** Sets up messages observable depending on thread or main chat */
  private setupMessagesObservable(): void {
    this.messages$ = this.isThreadView
      ? this.chatService.threadMessages$.pipe(
          map((m) => m ?? []),
          startWith([])
        )
      : this.chatService.messages$;
  }
  // ----------------------- Guest Chat Handling -----------------------

  /** Subscribes to guest direct messages and sets state accordingly */
  private subscribeToGuestDirectMessages(): void {
    this.channelDirectMessageData.selectedGuestDirectMessage$.subscribe(
      (guestUser: DirectMessage | null) => {
        if (!guestUser) return;
        this.setGuestChatState(guestUser);
        this.chatUIService.scrollToBottom();
      }
    );
  }

  /** Updates component state for a selected guest direct message */
  private setGuestChatState(guestUser: DirectMessage): void {
    this.isGuestChat = true;
    this.selectedChannel = null;
    this.messages$ = of([]);
    this.messages = [];
    this.otherUser = this.mapGuestUser(guestUser);
    this.chatIsConversation = true;
    this.chatIsChannel = false;
  }

  /** Maps guest direct message to appUser object */
  private mapGuestUser(guestUser: DirectMessage): appUser {
    return {
      id: guestUser.id,
      userName: guestUser.name,
      profilePic: parseInt(guestUser.img.replace('.png', ''), 10),
      status: guestUser.status === 'online',
      email: guestUser.name.replace(/\s+/g, '.').toLowerCase() + '@guest.local',
    } as appUser;
  }

  /** Subscribes to guest channels and sets state accordingly */
  private subscribeToGuestChannels(): void {
    this.channelDirectMessageData.selectedGuestChannel$.subscribe(
      async (channel) => {
        if (!channel?.channelId) return;
        await this.setGuestChannelState(channel);
        this.chatUIService.scrollToBottom();
      }
    );
  }

  /** Updates component state for a selected guest channel */
  private async setGuestChannelState(channel: Channel): Promise<void> {
    this.otherUser = null;
    this.chatIsConversation = false;
    this.chatIsThread = false;
    this.selectedChannel = channel;
    if (!channel?.channelId) return;
    await this.chatService.initializeChat(
      channel.channelId,
      this.currentUser?.id
    );
    this.messages$ = this.chatService.messages$;
    this.members = this.mapChannelMembers(channel);
    this.chatIsChannel = true;
  }

  /** Maps channel members to a structured array for the component */
  private mapChannelMembers(channel: Channel): any[] {
    return (
      channel.members?.map((id, i) => ({
        id,
        userName: id,
        profilePic: i + 1,
        status: true,
      })) || []
    );
  }
  // ----------------------- Message Handling -----------------------

  /** Sends a chat message with context (thread, conversation, edited) */
  async sendMessage(): Promise<void> {
    const messageText = this.chatMessage.trim();
    const channelId = this.selectedChannel?.channelId;
    const userId = this.currentUser?.id;
    if (!messageText || !channelId || !userId) return;
    await this.chatService.sendMessage(
      channelId,
      messageText,
      userId,
      this.buildChatContext()
    );
    this.resetChatInput();
  }

  /** Builds chat context object for sending messages */
  private buildChatContext() {
    return {
      isConversation: this.chatService.isConversation,
      isThread: this.isThreadView || this.chatService.isThread,
      activeThreadMessageId: this.chatService.activeThreadMessageId,
      editedMessage: this.editedMessage,
    };
  }

  /** Resets chat input field and clears edited message */
  private resetChatInput(): void {
    this.chatMessage = '';
    this.editedMessage = null;
    this.chatUIService.scrollToBottom();
  }

  /** Begins editing a message */
  startEditingMessage(message: any): void {
    this.chatMessage = message.text;
    this.editedMessage = message;
    this.chatUIService.focusChatInput();
  }

  /** Stops editing a message */
  stopEditing(): void {
    this.editedMessage = null;
    this.chatMessage = '';
    this.chatUIService.focusChatInput();
  }

  // ----------------------- Thread Handling -----------------------

  /** Handles reply to a message, opens thread if mobile or emits event */
  handleReplyToMessage(messageId: string): void {
    if (!this.isMobile) {
      this.threadOpened.emit(messageId);
    } else {
      this.chatService.openThread(messageId);
      this.chatUIService.scrollToBottom();
    }
  }

  /** Closes thread view depending on screen type */
  closeThreadView(): void {
    if (this.isMobile) {
      this.chatService.closeThread();
      this.isThreadView = false;
      this.chatUIService.scrollToBottom();
    } else {
      this.threadClosed.emit();
    }
  }
  // ----------------------- Navigation & Dialogs -----------------------

  /** Navigates to the main menu */
  navigateToMain(): void {
    this.router.navigate(['/main-menu']);
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
  // ----------------------- Subscriptions -----------------------

  /** Subscribes to thread messages observable */
  private subscribeToThreadMessages(): void {
    this.chatService.threadMessages$.subscribe(
      (msgs) => (this.threadMessages = msgs ?? [])
    );
  }

  /** Subscribes to thread status observable */
  private subscribeToThreadStatus(): void {
    this.chatService.isThread$.subscribe((isThread) => {
      this.chatIsThread = isThread;
      if (isThread) {
        this.chatIsChannel = false;
        this.chatIsConversation = false;
      }
      setTimeout(() => this.chatUIService.scrollToBottom(), 100);
      this.chatUIService.focusChatInput();
    });
  }

  /** Subscribes to general messages observable */
  private subscribeToMessages(): void {
    this.chatService.messages$.subscribe((messages) => {
      this.messages = messages;
      if (messages.length)
        setTimeout(() => {
          this.chatUIService.scrollToBottom();
          this.chatUIService.focusChatInput();
        }, 100);
    });
  }

  /** Subscribes to selected channel observable */
  private subscribeToSelectedChannel(): void {
    this.chatService.selectedChannel$.subscribe((channel) => {
      this.selectedChannel = channel;
      this.chatUIService.fetchMentionableUsers(channel?.channelId);
      this.chatUIService.fetchAllChannels();
    });
  }

  /** Subscribes to other user observable */
  private subscribeToOtherUser(): void {
    this.chatService.otherUser$.subscribe((user) => (this.otherUser = user));
  }

  /** Subscribes to active thread message observable */
  private subscribeToActiveThreadMessage(): void {
    this.chatService.activeThreadMessage$.subscribe(
      (msg) => (this.activeThreadMessage = msg)
    );
  }

  /** Subscribes to Chat UI state observables (mentions, hashtags, emoji) */
  private subscribeToChatUIObservables(): void {
    const ui = this.chatUIService;
    ui.mentionPopupVisible$.subscribe(
      (val) => (this.mentionPopupVisible = val)
    );
    ui.hashtagPopupVisible$.subscribe(
      (val) => (this.hashtagPopupVisible = val)
    );
    ui.filteredMentionableUsers$.subscribe(
      (val) => (this.filteredMentionableUsers = val)
    );
    ui.filteredChannels$.subscribe((val) => (this.filteredChannels = val));
    ui.emojiPickerVisible$.subscribe((val) => (this.emojiPickerVisible = val));
    ui.pickerPosition$.subscribe((val) => (this.pickerPosition = val));
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
}
