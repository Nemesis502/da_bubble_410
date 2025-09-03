import {
  Component,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmojiPickerComponent } from '../emoji-picker/emoji-picker.component';
import { Router } from '@angular/router';
import { appUser } from '../../interfaces/user.interface';
import { SessionService } from '../../shared/services/currentUserSession.service';
import {
  MentionService,
  MentionUser,
  MentionChannel,
} from '../../shared/services/mentions.service';
import { NewMessageSendingService } from '../../shared/services/new-message-sending.service';
import { AutocompleteService } from '../../shared/services/autocomplete.service';

interface PickerPosition {
  top: number;
  left: number;
}

@Component({
  selector: 'app-new-message',
  standalone: true,
  imports: [
    FormsModule,
    MatIconModule,
    MatCardModule,
    CommonModule,
    EmojiPickerComponent,
  ],
  templateUrl: './new-message.component.html',
  styleUrl: './new-message.component.scss',
})
export class NewMessageComponent implements OnInit {
  userSession = inject(SessionService);

  @ViewChild('chatField') chatField!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('chatBody') private chatBodyRef!: ElementRef;
  @ViewChild('searchField') searchField!: ElementRef<HTMLTextAreaElement>;

  searchInput: string = '';
  chatMessage: string = '';
  currentUser: appUser | null = null;

  mentionPopupVisible = false;
  hashtagPopupVisible = false;
  emojiPickerVisible = false;
  pickerPosition: PickerPosition = { top: 0, left: 0 };

  searchFieldMentionVisible = false;
  searchFieldHashtagVisible = false;

  searchMentionUsers: MentionUser[] = [];
  searchHashtagChannels: MentionChannel[] = [];
  mentionableUsers: MentionUser[] = [];
  allChannels: MentionChannel[] = [];
  selectedChannel: MentionChannel | null = null;

  constructor(
    private messageService: NewMessageSendingService,
    private mentionService: MentionService,
    private autocompleteService: AutocompleteService,
    private router: Router,
    private elementRef: ElementRef
  ) {}

  // Component initialization
  async ngOnInit(): Promise<void> {
    this.currentUser = this.userSession.getCurrentUser();
    await this.loadInitialData();
  }

  // Load initial users and channels for mentions and hashtags
  private async loadInitialData(): Promise<void> {
    if (!this.currentUser?.id) return;

    this.allChannels = await this.mentionService.fetchUserChannels(
      this.currentUser.id
    );
    this.mentionableUsers = await this.mentionService.fetchMentionableUsers(
      this.selectedChannel?.id || null
    );
  }

  // Navigate back to main menu
  navigateToMain(): void {
    this.router.navigate(['/main-menu']);
  }

  /** EMOJI HANDLING */
  // Toggle emoji picker visibility and set position
  toggleEmojiPicker(event: MouseEvent): void {
    event.stopPropagation();
    this.emojiPickerVisible = !this.emojiPickerVisible;

    if (this.emojiPickerVisible) {
      const buttonRect = (event.target as HTMLElement).getBoundingClientRect();
      this.pickerPosition = {
        top: buttonRect.bottom + window.scrollY,
        left: buttonRect.left + window.scrollX,
      };
    }
  }

  // Insert selected emoji at cursor position
  addEmoji(emoji: string): void {
    const textarea = this.chatField?.nativeElement;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    this.chatMessage =
      this.chatMessage.slice(0, cursorPos) +
      emoji +
      this.chatMessage.slice(cursorPos);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        cursorPos + emoji.length,
        cursorPos + emoji.length
      );
    }, 0);
  }

  // Close emoji picker
  onPickerClosed() {
    this.emojiPickerVisible = false;
  }

  /** MESSAGE SENDING */
  async sendMessage(): Promise<void> {
    if (!this.canSendMessage()) return;
    const users = this.getTargetUsers();
    const senderId = this.currentUser!.id;

    if (users.length > 0) {
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const navigate = i === 0;
        await this.messageService.sendDirectMessage(
          senderId,
          user.id,
          this.chatMessage,
          navigate
        );
      }
    } else {
      const { channel } = this.getMessageTarget();
      if (channel) {
        await this.messageService.sendChannelMessage(
          senderId,
          channel.id,
          this.chatMessage
        );
      }
    }

    this.resetMessage();
  }

  // Validate if the message can be sent
  private canSendMessage(): this is {
    currentUser: { id: string };
  } & NewMessageComponent {
    return (
      !!this.chatMessage.trim() &&
      !!this.searchInput.trim() &&
      !!this.currentUser?.id
    );
  }

  // Determine the target user or channel for the message
  private getMessageTarget(): { user?: MentionUser; channel?: MentionChannel } {
    const user = this.getTargetUser();
    if (user) return { user };

    const channel = this.getTargetChannel();
    if (channel) return { channel };

    return {};
  }

  // Find the mentioned user in the search input
  private getTargetUser(): MentionUser | undefined {
    const mentionName = this.mentionService.extractMention(this.searchInput);
    if (!mentionName) return undefined;

    return this.mentionableUsers.find(
      (u) => u.userName.toLowerCase() === mentionName.toLowerCase()
    );
  }

  // Add this method to your component
  private getTargetUsers(): MentionUser[] {
    const mentionNames = this.mentionService.extractAllMentions(
      this.searchInput
    );
    if (!mentionNames || mentionNames.length === 0) return [];

    return this.mentionableUsers.filter((u) =>
      mentionNames.some(
        (name) => name.toLowerCase().trim() === u.userName.toLowerCase().trim()
      )
    );
  }

  // Find the mentioned channel in the search input
  private getTargetChannel(): MentionChannel | undefined {
    const channelName = this.mentionService.extractChannel(this.searchInput);
    if (!channelName) return undefined;

    return this.allChannels.find(
      (c) => c.name.toLowerCase() === channelName.toLowerCase()
    );
  }

  // Reset chat input and search field
  private resetMessage(): void {
    this.chatMessage = '';
    this.searchInput = '';
  }

  /** POPUP HANDLING */
  // Close emoji picker when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const pickerElement = this.elementRef.nativeElement.querySelector(
      '.emoji-picker-panel'
    );
    const buttonElement =
      this.elementRef.nativeElement.querySelector('.chat-buttons');

    if (
      pickerElement &&
      !pickerElement.contains(event.target as Node) &&
      buttonElement &&
      !buttonElement.contains(event.target as Node)
    ) {
      this.emojiPickerVisible = false;
    }
  }

  // Focus the chat input textarea
  focusChatInput(): void {
    this.chatField?.nativeElement.focus();
  }

  /** CHAT AUTOCOMPLETE HANDLING */
  // Handle key presses in chat for @mentions and #hashtags
  async handleChatKey(event: KeyboardEvent): Promise<void> {
    const char = event.key;

    if (char === '@') this.mentionPopupVisible = true;
    if (char === '#') this.hashtagPopupVisible = true;
    if ([' ', 'Enter', 'Escape'].includes(char)) this.closeAllPopups();

    setTimeout(() => this.updateAutocompleteLists(), 0);
  }

  // Close all autocomplete popups
  private closeAllPopups(): void {
    this.mentionPopupVisible = false;
    this.hashtagPopupVisible = false;
  }

  // Update mention and hashtag lists based on current text
  private updateAutocompleteLists(): void {
    this.searchMentionUsers = this.autocompleteService.filterMentions(
      this.chatMessage,
      this.mentionableUsers
    );
    this.mentionPopupVisible = this.chatMessage.includes('@');

    this.searchHashtagChannels = this.autocompleteService.filterHashtags(
      this.chatMessage,
      this.allChannels
    );
    this.hashtagPopupVisible = this.chatMessage.includes('#');
  }

  /** INSERTING MENTION OR HASHTAG */
  // Insert selected user mention into chat
  selectMentionUser(userName: string): void {
    this.insertAtCursor(
      '@',
      userName,
      'chatMessage',
      this.chatField.nativeElement
    );
    this.mentionPopupVisible = false;
  }

  // Insert selected hashtag into chat
  selectHashtagChannel(channelName: string): void {
    this.insertAtCursor(
      '#',
      channelName,
      'chatMessage',
      this.chatField.nativeElement
    );
    this.hashtagPopupVisible = false;
  }

  // Insert mention into search field
  insertMentionInSearch(userName: string): void {
    this.insertAtCursor(
      '@',
      userName,
      'searchInput',
      this.searchField.nativeElement
    );
    this.searchFieldMentionVisible = false;
  }

  // Insert hashtag into search field
  insertHashtagInSearch(channelName: string): void {
    this.insertAtCursor(
      '#',
      channelName,
      'searchInput',
      this.searchField.nativeElement
    );
    this.searchFieldHashtagVisible = false;
  }

  // Generic method to insert mention or hashtag at cursor position
  private insertAtCursor(
    triggerChar: '@' | '#',
    value: string,
    targetField: 'chatMessage' | 'searchInput',
    textarea: HTMLTextAreaElement
  ): void {
    const cursorPos = textarea.selectionStart;
    const { newText, newCursorPos } = this.autocompleteService.insertAtCursor(
      triggerChar,
      value,
      this[targetField],
      cursorPos
    );

    this[targetField] = newText;

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }

  /** HANDLE CHAT MENTION TRIGGER */
  // Handles @ or # triggers in chat input
  async checkMentionTrigger(event: KeyboardEvent): Promise<void> {
    const char = event.key;

    if (char === '@') {
      this.mentionPopupVisible = true;
    } else if (char === '#') {
      this.hashtagPopupVisible = true;
    } else if ([' ', 'Enter', 'Escape'].includes(char)) {
      this.closeAllPopups();
    }

    setTimeout(() => this.updateAutocompleteLists(), 0);
  }

  /** SEARCH FIELD AUTOCOMPLETE */
  // Handle key presses in search input
  async handleSearchFieldKey(event: KeyboardEvent): Promise<void> {
    setTimeout(() => {
      this.searchMentionUsers = this.autocompleteService.filterMentions(
        this.searchInput,
        this.mentionableUsers
      );
      this.searchHashtagChannels = this.autocompleteService.filterHashtags(
        this.searchInput,
        this.allChannels
      );
      this.searchFieldMentionVisible = this.searchInput.includes('@');
      this.searchFieldHashtagVisible = this.searchInput.includes('#');
    }, 0);
  }

  /** MANUAL @ TRIGGER INSERTION */
  // Inserts or removes a manual @ in chat input
  triggerMention(): void {
    const textarea = this.chatField?.nativeElement;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const charBefore = this.chatMessage[cursorPos - 1];

    if (charBefore === '@') {
      this.removeAtSymbol(cursorPos, textarea);
    } else {
      this.insertAtSymbol(cursorPos, textarea);
    }

    textarea.focus();
  }

  // Remove '@' at the current cursor position
  private removeAtSymbol(
    cursorPos: number,
    textarea: HTMLTextAreaElement
  ): void {
    this.chatMessage =
      this.chatMessage.slice(0, cursorPos - 1) +
      this.chatMessage.slice(cursorPos);
    textarea.setSelectionRange(cursorPos - 1, cursorPos - 1);
    this.mentionPopupVisible = false;
  }

  // Insert '@' at the current cursor position
  private insertAtSymbol(
    cursorPos: number,
    textarea: HTMLTextAreaElement
  ): void {
    const { newText, newCursorPos } = this.autocompleteService.insertAtCursor(
      '@',
      '',
      this.chatMessage,
      cursorPos
    );
    this.chatMessage = newText;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    this.mentionPopupVisible = true;
  }
}
