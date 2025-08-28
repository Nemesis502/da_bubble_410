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
  ],
})
export class ChatTemplateComponent implements AfterViewInit, OnInit {
  @Input() isThreadView: boolean = false;
  @Input() chatId!: string | null;
  @Input() threadId!: string | null;
  @Input() chatType: 'channel' | 'conversation' | null = null;
  @Output() threadOpened = new EventEmitter<string>();
  @Output() threadClosed = new EventEmitter<void>();

  private userSession = inject(SessionService);
  private chatService = inject(ChatService);
  private chatUIService = inject(ChatUIService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private elementRef = inject(ElementRef);

  // View Children
  @ViewChild('chatField') chatFieldRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('chatBody') private chatBodyRef!: ElementRef;

  // Component State (reduced)
  currentUser: appUser | null = null;
  otherUser: appUser | null = null;
  selectedChannel: any = null;
  chatMessage: string = '';
  editedMessage: any = null;
  threadMessages: any[] = [];
  members: any[] = [];
  // Observables for reactive data
  messages$: Observable<any[]> = of([]);
  threadMessages$: Observable<any[] | null> = of(null);
  activeThreadMessage: any | null = null;

  // UI State (managed by ChatUIService, but component needs to bind)
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
  }

  async ngOnInit(): Promise<void> {
    this.currentUser = this.userSession.getCurrentUser();
    this.isMobile = this.width < 999;
    // Initialize chat type and set chatIsChannel / chatIsConversation
    await this.initializeChatType();

    // Always subscribe to guest-related observables (needed for guest handling)
    if (!this.isMobile) {
      this.subscribeToGuestDirectMessages();
    }

    this.subscribeToGuestChannels();

    // Initialize the chat (thread or chatId)
    await this.initializeChatBasedOnThreadOrChatId();

    // Conditionally call only the relevant setup functions
    if (this.chatIsChannel) {
      this.setupMessagesObservable();
      this.subscribeToMessages();
      this.subscribeToSelectedChannel();
      this.subscribeToActiveThreadMessage(); // optional, if channels can have threads
      this.fetchChannelMembers();
    } else if (this.chatIsConversation) {
      this.setupMessagesObservable();
      this.subscribeToMessages();
      this.subscribeToOtherUser();
      this.subscribeToActiveThreadMessage(); // optional, if conversations can have threads
      if (this.isMobile) {
        this.subscribeToGuestDirectMessages();
      }
    }

    // Subscriptions common to both
    this.subscribeToThreadMessages();
    this.subscribeToThreadStatus();
    this.subscribeToChatUIObservables();

    // Fetch general channel info
    this.chatUIService.fetchAllChannels();
  }

  private subscribeToGuestDirectMessages(): void {
    this.channelDirectMessageData.selectedGuestDirectMessage$.subscribe(
      (guestUser: DirectMessage | null) => {
        if (guestUser) {
          this.isGuestChat = true;
          this.selectedChannel = null;
          this.messages$ = of([]);
          this.messages = [];
          (this.otherUser = {
            id: guestUser.id,
            userName: guestUser.name,
            profilePic: parseInt(guestUser.img.replace('.png', ''), 10),
            status: guestUser.status === 'online',
            email:
              guestUser.name.replace(/\s+/g, '.').toLowerCase() +
              '@guest.local',
          } as appUser),
            (this.chatIsConversation = true);
          this.chatIsChannel = false;
          setTimeout(() => {
            this.scrollToBottom();
            this.focusChatInput();
          }, 100);
        }
      }
    );
  }

  private subscribeToGuestChannels(): void {
    this.channelDirectMessageData.selectedGuestChannel$.subscribe(
      async (channel: Channel | null) => {
        if (channel && channel.channelId) {
          this.otherUser = null;
          this.chatIsConversation = false;
          this.chatIsThread = false;
          this.selectedChannel = channel;
          await this.chatService.initializeChat(
            channel.channelId,
            this.currentUser?.id
          );
          this.messages$ = this.chatService.messages$;
          this.members =
            channel.members?.map((id, index) => ({
              id,
              userName: id,
              profilePic: index + 1,
              status: true,
            })) || [];
          this.chatIsChannel = true;
          this.chatIsConversation = false;
          setTimeout(() => {
            this.scrollToBottom();
            this.focusChatInput();
          }, 100);
        }
      }
    );
  }

  private async initializeChatBasedOnThreadOrChatId(): Promise<void> {
    if (this.threadId) {
      this.isThreadView = true;
      await this.chatService.initializeChat(
        this.threadId,
        this.currentUser?.id
      );
    } else if (this.chatId) {
      this.isThreadView = false;
      await this.chatService.initializeChat(this.chatId, this.currentUser?.id);
    }
  }

  private setupMessagesObservable(): void {
    this.messages$ = this.isThreadView
      ? this.chatService.threadMessages$.pipe(
          map((messages) => messages ?? []),
          startWith([])
        )
      : this.chatService.messages$;
  }

  private subscribeToThreadMessages(): void {
    this.chatService.threadMessages$.subscribe((msgs) => {
      this.threadMessages = msgs ?? [];
    });
  }

  private subscribeToThreadStatus(): void {
    this.chatService.isThread$.subscribe((isThread) => {
      this.chatIsThread = isThread;
      setTimeout(() => this.scrollToBottom(), 100);
      this.focusChatInput();
    });
  }

  private subscribeToMessages(): void {
    this.chatService.messages$.subscribe((messages) => {
      this.messages = messages;
      if (messages.length) {
        setTimeout(() => this.scrollToBottom(), 100);
        this.focusChatInput();
      }
    });
  }

  private subscribeToSelectedChannel(): void {
    this.chatService.selectedChannel$.subscribe((channel) => {
      this.selectedChannel = channel;
      this.chatUIService.fetchMentionableUsers(channel?.channelId);
      this.chatUIService.fetchAllChannels();
    });
  }

  private subscribeToOtherUser(): void {
    this.chatService.otherUser$.subscribe((user) => (this.otherUser = user));
  }

  private subscribeToActiveThreadMessage(): void {
    this.chatService.activeThreadMessage$.subscribe(
      (msg) => (this.activeThreadMessage = msg)
    );
  }

  private subscribeToChatUIObservables(): void {
    this.chatUIService.mentionPopupVisible$.subscribe(
      (val) => (this.mentionPopupVisible = val)
    );
    this.chatUIService.hashtagPopupVisible$.subscribe(
      (val) => (this.hashtagPopupVisible = val)
    );
    this.chatUIService.filteredMentionableUsers$.subscribe(
      (val) => (this.filteredMentionableUsers = val)
    );
    this.chatUIService.filteredChannels$.subscribe(
      (val) => (this.filteredChannels = val)
    );
    this.chatUIService.emojiPickerVisible$.subscribe(
      (val) => (this.emojiPickerVisible = val)
    );
    this.chatUIService.pickerPosition$.subscribe(
      (val) => (this.pickerPosition = val)
    );
  }

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

  // Message Sending & Editing
  async sendMessage(): Promise<void> {
    const messageText = this.chatMessage.trim();
    if (
      !messageText ||
      !this.selectedChannel?.channelId ||
      !this.currentUser?.id
    )
      return;

    const chatContext = {
      isConversation: this.chatService.isConversation,
      isThread: this.isThreadView || this.chatService.isThread,
      activeThreadMessageId: this.chatService.activeThreadMessageId,
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

  // Thread Handling
  handleReplyToMessage(messageId: string): void {
    if (!this.isMobile) {
      this.threadOpened.emit(messageId);
    } else {
      this.chatService.openThread(messageId);
      this.scrollToBottom();
    }
  }

  closeThreadView(): void {
    if (this.isMobile) {
      this.chatService.closeThread();
      this.isThreadView = false;
      this.scrollToBottom();
    } else {
      this.threadClosed.emit();
    }
  }

  // Navigation & Dialogs (delegated to ChatUIService)
  navigateToMain(): void {
    this.router.navigate(['/main-menu']);
  }

  openMenuDialog(): void {
    this.chatUIService.openMenuDialog();
  }

  openMemberDialog(): void {
    this.chatUIService.openMemberDialog(this.selectedChannel?.channelId);
  }

  openAddPeopleDialog(): void {
    this.chatUIService.openAddPeopleDialog(this.selectedChannel?.channelId);
  }

  openProfileDialogOtherUser(): void {
    this.chatUIService.openProfileDialog(this.otherUser, this.currentUser?.id);
  }

  openChannelInfo(): void {
    this.isChannelInfoOpen = true;
  }

  // Mention & Hashtag Functions (delegated to ChatUIService)
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

  triggerMention(): void {
    this.chatUIService.triggerMention(this.selectedChannel?.channelId);
  }

  // Emoji Picker Functions (delegated to ChatUIService)
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

  // DOM Utilities
  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.chatBodyRef) {
        const container = this.chatBodyRef.nativeElement;
        container.scrollTop = container.scrollHeight;
      }
    }, 0);
  }

  focusChatInput(): void {
    if (this.chatFieldRef) {
      this.chatFieldRef.nativeElement.focus();
    }
  }

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

  private async initializeChatType(): Promise<void> {
    let type: 'channel' | 'conversation' | null = null;

    // Big screen: @Input chatType takes precedence
    if (this.chatType) {
      type = this.chatType;
    } else {
      // Small screen: read from route
      const paramMap = this.route.snapshot.paramMap;
      const routeType = paramMap.get('type');
      if (routeType === 'channel' || routeType === 'conversation') {
        type = routeType;
      }
    }

    if (type === 'channel') {
      this.chatIsChannel = true;
      this.chatIsConversation = false;
    } else if (type === 'conversation') {
      this.chatIsChannel = false;
      this.chatIsConversation = true;
    } else {
      // fallback: reset both
      this.chatIsChannel = false;
      this.chatIsConversation = false;
    }
  }

  setActiveChatField() {
    this.chatUIService.setChatContext(
      this.chatFieldRef,
      () => this.chatMessage,
      (msg) => (this.chatMessage = msg)
    );
  }
}
