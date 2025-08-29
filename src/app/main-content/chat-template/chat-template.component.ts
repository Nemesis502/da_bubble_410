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
import { map, startWith } from 'rxjs/operators';
import { MessageTemplateComponent } from '../message-template/message-template.component';
import { EmojiPickerComponent } from '../emoji-picker/emoji-picker.component';
import { ChannelInfoComponent } from '../channel-info/channel-info.component';
import { ChatService } from '../../shared/services/chat.service';
import { ChatUIService } from '../../shared/services/chat-ui.service';
import { SessionService } from '../../shared/services/currentUserSession.service';
import { FirestoreService } from '../../shared/services/firestore.service';
import {
  ChannelsDirectMessageService,
  DirectMessage,
} from '../../shared/services/channels-direct-message.service';
import { appUser } from '../../interfaces/user.interface';
import { Channel } from '../../interfaces/channel.interface';
import { ChatActionsService } from '../../shared/services/chat-action.service';
import { ChatGuestService } from '../../shared/services/chat-guest.service';

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
  @Input() isThreadView: boolean = false;
  @Input() chatId!: string | null;
  @Input() threadId!: string | null;
  @Input() chatType: 'channel' | 'conversation' | null = null;
  @Output() threadOpened = new EventEmitter<string>();
  @Output() threadClosed = new EventEmitter<void>();

  // ----------------------- Injected Services -----------------------
  private userSession = inject(SessionService);
  private chatService = inject(ChatService);
  private chatUIService = inject(ChatUIService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private elementRef = inject(ElementRef);
  private chatActions = inject(ChatActionsService);
  private guestService = inject(ChatGuestService);
  // ----------------------- ViewChild Elements -----------------------
  @ViewChild('chatField') chatFieldRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('chatBody') private chatBodyRef!: ElementRef;

  // ----------------------- Component State -----------------------
  currentUser: appUser | null = null;
  otherUser: appUser | null = null;
  selectedChannel: any = null;
  chatMessage: string = '';
  editedMessage: any = null;
  threadMessages: any[] = [];
  members: any[] = [];
  messages$: Observable<any[]> = of([]);
  threadMessages$: Observable<any[] | null> = of(null);
  activeThreadMessage: any | null = null;
  mentionPopupVisible: boolean = false;
  hashtagPopupVisible: boolean = false;
  filteredMentionableUsers: any[] = [];
  filteredChannels: any[] = [];
  emojiPickerVisible: boolean = false;
  pickerPosition: PickerPosition = { top: 0, left: 0 };
  isChannelInfoOpen: boolean = false;
  isMobile: boolean = false;
  chatIsThread: boolean = false;
  chatIsChannel: boolean = false;
  chatIsConversation: boolean = false;
  messages: any[] = [];
  width: number = window.innerWidth;
  isGuestChat: boolean = false;

  constructor(
    private firestoreService: FirestoreService,
    private hostEl: ElementRef,
    private channelDirectMessageData: ChannelsDirectMessageService
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
// ----------------------- Guest Subscriptions -----------------------
// Sets up all guest-related subscriptions for direct messages and channels
private setupGuestSubscriptions(): void {
  if (!this.isMobile) this.subscribeToGuestDirectMessages();
  this.subscribeToGuestChannels();
}

// Subscribes to guest direct messages and updates component state via callback
private subscribeToGuestDirectMessages(): void {
  this.guestService.subscribeToGuestDirectMessages((user, isConversation) => {
    this.setGuestDirectMessageState(user, isConversation);
  });
}

// Subscribes to guest channels and initializes chat state for the selected channel
private subscribeToGuestChannels(): void {
  this.guestService.subscribeToGuestChannels(async (channel) => {
    if (!channel.channelId || !this.currentUser?.id) return;
    await this.setGuestChannelState(channel);
  });
}

// Updates component state when a guest direct message is selected
private setGuestDirectMessageState(user: appUser, isConversation: boolean) {
  this.otherUser = user;
  this.isGuestChat = true;
  this.selectedChannel = null;
  this.messages$ = of([]);
  this.messages = [];
  this.chatIsConversation = isConversation;
  this.chatIsChannel = !isConversation;
  this.chatUIService.scrollToBottom();
}

// Updates component state when a guest channel is selected and initializes the channel chat
private async setGuestChannelState(channel: Channel) {
  this.otherUser = null;
  this.chatIsConversation = false;
  this.chatIsThread = false;
  this.selectedChannel = channel;
  await this.chatService.initializeChat(
    channel.channelId!,
    this.currentUser!.id
  );
  this.messages$ = this.chatService.messages$;
  this.members = this.guestService.mapChannelMembers(channel);
  this.chatIsChannel = true;
  this.chatUIService.scrollToBottom();
}


  // ----------------------- Message Handling -----------------------

  /** Sends a chat message with context (thread, conversation, edited) */
  async sendMessage(): Promise<void> {
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
