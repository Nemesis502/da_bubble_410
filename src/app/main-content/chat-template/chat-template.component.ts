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
          this.chatIsThread = false;
          this.updateChatContext();

          setTimeout(() => {
            this.scrollToBottom();
            this.focusChatInput();
          }, 100);
        }
      }
    );
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
          this.updateChatContext();
          setTimeout(() => {
            this.scrollToBottom();
            this.focusChatInput();
          }, 100);
        }
      }
    );
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
    this.messages$ = this.isThreadView
      ? this.chatService.threadMessages$.pipe(
          map((messages) => messages ?? []),
          startWith([])
        )
      : this.chatService.messages$;
    this.chatService.threadMessages$.subscribe((msgs) => {
      this.threadMessages = msgs ?? [];
    });

    this.chatService.isThread$.subscribe((isThread) => {
      this.chatIsThread = isThread;
      this.updateChatContext();
      setTimeout(() => this.scrollToBottom(), 100);
      this.focusChatInput();
    });
    this.chatService.messages$.subscribe((messages) => {
      this.messages = messages;
      if (messages.length) {
        setTimeout(() => this.scrollToBottom(), 100);
        this.focusChatInput();
      }
    });

    this.chatService.selectedChannel$.subscribe((channel) => {
      this.selectedChannel = channel;
      this.updateChatContext();
      this.chatUIService.fetchMentionableUsers(channel?.channelId);
      this.chatUIService.fetchAllChannels();
    });
    if (!this.isGuestChat) {
      this.chatService.otherUser$.subscribe((user) => (this.otherUser = user));
    }
    this.chatService.activeThreadMessage$.subscribe(
      (msg) => (this.activeThreadMessage = msg)
    );

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

    this.chatUIService.fetchAllChannels();
    this.updateChatContext();
    this.fetchChannelMembers();
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['threadId'] && this.threadId) {
      this.isThreadView = true;
      await this.chatService.initializeChat(
        this.threadId,
        this.currentUser?.id
      );
      this.messages$ = this.chatService.threadMessages$.pipe(
        map((messages) => messages ?? []),
        startWith([])
      );
    } else if (changes['chatId'] && this.chatId) {
      this.isThreadView = false;
      if (!changes['chatId'].firstChange) {
        this.otherUser = null;
      }

      await this.chatService.initializeChat(this.chatId, this.currentUser?.id);
      this.messages$ = this.chatService.messages$;
    }
    if (changes['chatId'] && this.chatId) {
      await this.fetchChannelMembers();
    }

    this.updateChatContext();
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
      this.updateChatContext();
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

  updateChatContext(): void {
    this.chatIsThread = false;
    this.chatIsChannel = false;
    this.chatIsConversation = false;
    if (this.isThreadView || this.chatService.isThread) {
      this.chatIsThread = true;
    } else if (this.otherUser) {
      this.chatIsConversation = true;
    } else if (this.selectedChannel) {
      this.chatIsChannel = true;
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
