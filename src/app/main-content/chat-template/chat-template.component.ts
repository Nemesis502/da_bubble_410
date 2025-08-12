import {
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
    './chat-template.media-query.component.scss'
  ]
})
export class ChatTemplateComponent implements OnInit {
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
  @ViewChild('chatField') chatField!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('chatBody') private chatBodyRef!: ElementRef;

  // Component State (reduced)
  currentUser: appUser | null = null;
  otherUser: appUser | null = null;
  selectedChannel: any = null;
  chatMessage: string = '';
  editedMessage: any = null;
  threadMessages: any[] = [];

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

  constructor() {
    this.chatUIService.init(
      this.chatField,
      this.elementRef,
      () => this.chatMessage,
      (msg) => (this.chatMessage = msg)
    );
  }

  async ngOnInit(): Promise<void> {
    this.currentUser = this.userSession.getCurrentUser();
    this.isMobile = this.width < 999;

    if (this.threadId) {
      this.isThreadView = true;
      await this.chatService.initializeChat(this.threadId, this.currentUser?.id);
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

    this.chatService.isThread$.subscribe((isThread) => {
      this.chatIsThread = isThread;
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
          console.log("Channel:",this.selectedChannel);
      this.chatUIService.fetchMentionableUsers(channel?.channelId);
      this.chatUIService.fetchAllChannels();
    });

    this.chatService.otherUser$.subscribe((user) => (this.otherUser = user));

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
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['threadId'] && this.threadId) {
      this.isThreadView = true;
      await this.chatService.initializeChat(this.threadId, this.currentUser?.id);
      this.messages$ = this.chatService.threadMessages$.pipe(
        map((messages) => messages ?? []),
        startWith([])
      );
    } else if (changes['chatId'] && this.chatId) {
      this.isThreadView = false;
      await this.chatService.initializeChat(this.chatId, this.currentUser?.id);
      this.messages$ = this.chatService.messages$;
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

  // Thread Handling
  handleReplyToMessage(messageId: string): void {
    console.log(messageId);

    this.threadOpened.emit(messageId);
  }
  closeThreadView(): void {
    this.threadClosed.emit();
  }
  // handleReplyToMessage(messageId: string): void {
  //   console.log('Opening thread for message ID:', messageId);
  //   this.chatService.openThread(messageId);
  //   this.scrollToBottom();
  // }

  // closeThreadView(): void {
  //   this.chatService.closeThread();
  //   if (this.isThreadView) return;
  //   const channelId = this.selectedChannel?.channelId;
  //   if (channelId) {
  //     this.router.navigate([`/chat-container/${channelId}`]);
  //   }
  // }

  // Navigation & Dialogs (delegated to ChatUIService)
  navigateToMain(): void {
    this.router.navigate(['/main']);
  }

  openMenuDialog(): void {
    this.chatUIService.openMenuDialog();
  }

  openMemberDialog(): void {
    this.chatUIService.openMemberDialog(this.selectedChannel?.channelId);
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
    if (this.chatField) {
      this.chatField.nativeElement.focus();
    }
  }
}
