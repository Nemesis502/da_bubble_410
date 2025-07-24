import {
  Component,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ChannelsDirectMessageService } from '../../shared/services/channels-direct-message.service';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { EmojiPickerComponent } from '../emoji-picker/emoji-picker.component';
import { FormsModule } from '@angular/forms';
import {
  Firestore,
  collection,
  getDocs,
  addDoc,
  query,
  where,
} from '@angular/fire/firestore';
import { appUser } from '../../interfaces/user.interface';
import { SessionService } from '../../shared/services/currentUserSession.service';

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

  searchFieldMentionVisible = false;
  searchFieldHashtagVisible = false;

  searchMentionUsers: {
    id: string;
    userName: string;
    profilePic: string;
    status: boolean;
  }[] = [];

  searchHashtagChannels: { id: string; name: string }[] = [];

  searchPopupTop: number = 0;
  searchPopupLeft: number = 0;

  mentionableUsers: {
    id: string;
    userName: string;
    profilePic: string;
    status: boolean;
  }[] = [];

  allChannels: { id: string; name: string }[] = [];

  mentionPopupVisible = false;
  hashtagPopupVisible: boolean = false;

  selectedChannel: any = null;
  chatMessage: string = '';
  currentUser: appUser | null = null;

  emojiPickerVisible: boolean = false;
  pickerPosition: PickerPosition = { top: 0, left: 0 };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private elementRef: ElementRef,
    private channelService: ChannelsDirectMessageService,
    private firestore: Firestore
  ) {}

  async ngOnInit(): Promise<void> {
    this.currentUser = this.userSession.getCurrentUser();
    await this.fetchAllChannels();
    await this.fetchMentionableUsers();
  }

  navigateToMain(): void {
    this.router.navigate(['/main']);
  }

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

  addEmoji(emoji: string): void {
    if (this.chatField) {
      const textarea = this.chatField.nativeElement;
      const cursorPos = textarea.selectionStart;
      const textBefore = this.chatMessage.slice(0, cursorPos);
      const textAfter = this.chatMessage.slice(cursorPos);
      this.chatMessage = `${textBefore}${emoji}${textAfter}`;
      textarea.focus();
      setTimeout(() => {
        textarea.setSelectionRange(
          cursorPos + emoji.length,
          cursorPos + emoji.length
        );
      }, 0);
    }
  }

  onPickerClosed() {
    this.emojiPickerVisible = false;
  }

async sendMessage(): Promise<void> {
  if (!this.chatMessage.trim() || !this.searchInput.trim()) return;

  const mentionName = this.extractMention(this.searchInput);
  const channelName = this.extractChannel(this.searchInput);

  if (mentionName) {
    await this.sendMessageToConversation(mentionName);
    return;
  }

  if (channelName) {
    await this.sendMessageToChannel(channelName);
    return;
  }

  console.warn('No valid #channel or @user mention');
}

private extractMention(input: string): string | null {
  const match = input.match(/@([\wÀ-ÿ .'-]+)/);
  return match ? match[1].trim() : null;
}

private extractChannel(input: string): string | null {
  const match = input.match(/#([^\s#@]+)/);
  return match ? match[1].trim() : null;
}
private async sendMessageToConversation(userName: string): Promise<void> {
  const mentionedUser = this.mentionableUsers.find(
    (user) => user.userName.toLowerCase() === userName.toLowerCase()
  );

  if (!mentionedUser || !this.currentUser?.id) {
    console.warn(`User @${userName} not found or session invalid`);
    return;
  }

  const conversationId = await this.getOrCreateConversation(
    this.currentUser.id,
    mentionedUser.id
  );

  const message = {
    senderID: this.currentUser.id,
    text: this.chatMessage,
    timestamp: new Date(),
  };

  const msgCol = collection(
    this.firestore,
    `conversations/${conversationId}/directMessages`
  );
  await addDoc(msgCol, message);

  this.chatMessage = '';
  this.searchInput = '';
  this.router.navigate([`/chat/${conversationId}`]);
}
private async getOrCreateConversation(
  userA: string,
  userB: string
): Promise<string> {
  const convRef = collection(this.firestore, 'conversations');
  const q = query(convRef, where('participants', 'array-contains', userA));
  const snapshot = await getDocs(q);

  const existing = snapshot.docs.find((doc) => {
    const participants = doc.data()['participants'] as string[];
    return participants.includes(userB);
  });

  if (existing) return existing.id;

  const newConv = await addDoc(convRef, {
    participants: [userA, userB],
  });
  return newConv.id;
}
private async sendMessageToChannel(channelName: string): Promise<void> {
  const matchedChannel = this.allChannels.find(
    (ch) => ch.name.toLowerCase() === channelName.toLowerCase()
  );

  if (!matchedChannel || !this.currentUser?.id) {
    console.warn(`Channel #${channelName} not found or session invalid`);
    return;
  }

  const message = {
    channelId: matchedChannel.id,
    senderID: this.currentUser.id,
    text: this.chatMessage,
    timestamp: new Date(),
  };

  const msgCol = collection(
    this.firestore,
    `channels/${matchedChannel.id}/messages`
  );
  await addDoc(msgCol, message);

  this.chatMessage = '';
  this.searchInput = '';
  this.router.navigate([`/chat/${matchedChannel.id}`]);
}

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

  focusChatInput(): void {
    if (this.chatField) {
      this.chatField.nativeElement.focus();
    }
  }

  triggerMention(): void {
    const textarea = this.chatField?.nativeElement;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBefore = this.chatMessage.slice(0, cursorPos);
    const charBefore = textBefore.charAt(textBefore.length - 1);

    if (charBefore === '@') {
      this.removeMentionSymbol(cursorPos);
    } else {
      this.insertMentionSymbol(cursorPos);
    }
  }

  private insertMentionSymbol(cursorPos: number): void {
    const textarea = this.chatField?.nativeElement;
    if (!textarea) return;

    const textBefore = this.chatMessage.slice(0, cursorPos);
    const textAfter = this.chatMessage.slice(cursorPos);

    this.chatMessage = `${textBefore}@${textAfter}`;

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos + 1, cursorPos + 1);
    }, 0);

    this.mentionPopupVisible = true;
    this.fetchMentionableUsers();
  }

  private removeMentionSymbol(cursorPos: number): void {
    const textarea = this.chatField?.nativeElement;
    if (!textarea) return;

    const textBefore = this.chatMessage.slice(0, cursorPos - 1);
    const textAfter = this.chatMessage.slice(cursorPos);

    this.chatMessage = `${textBefore}${textAfter}`;

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos - 1, cursorPos - 1);
    }, 0);

    this.mentionPopupVisible = false;
  }

  async checkMentionTrigger(event: KeyboardEvent): Promise<void> {
    const char = event.key;

    if (char === '@') {
      await this.handleMentionTrigger();
    } else if (char === '#') {
      this.handleHashtagTrigger();
    } else if ([' ', 'Enter', 'Escape'].includes(char)) {
      this.closeAllPopups();
    }

    setTimeout(() => this.cleanupMentionAndHashtag(), 0);
  }

  async checkSearchFieldTrigger(event: KeyboardEvent): Promise<void> {
    const char = event.key;

    if (char === '@') {
      this.mentionPopupVisible = true;
      await this.fetchMentionableUsers();
    } else if (char === '#') {
      this.hashtagPopupVisible = true;
      await this.fetchAllChannels();
    } else if ([' ', 'Enter', 'Escape'].includes(char)) {
      this.closeAllPopups();
    }

    setTimeout(() => this.cleanupSearchTriggers(), 0);
  }

  private cleanupSearchTriggers(): void {
    if (!this.searchInput.includes('@')) {
      this.mentionPopupVisible = false;
    }
    if (!this.searchInput.includes('#')) {
      this.hashtagPopupVisible = false;
    }
  }

  private async handleMentionTrigger(): Promise<void> {
    this.mentionPopupVisible = true;
    await this.fetchMentionableUsers();
  }

  private handleHashtagTrigger(): void {
    this.hashtagPopupVisible = true;
  }

  private closeAllPopups(): void {
    this.mentionPopupVisible = false;
    this.hashtagPopupVisible = false;
  }

  private cleanupMentionAndHashtag(): void {
    if (!this.chatMessage.includes('@')) {
      this.mentionPopupVisible = false;
    }
    if (!this.chatMessage.includes('#')) {
      this.hashtagPopupVisible = false;
    }
  }

  async fetchMentionableUsers(): Promise<void> {
    try {
      const usersCollectionRef = collection(this.firestore, 'users');
      const querySnapshot = await getDocs(usersCollectionRef);

      const users = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userName: data['userName'],
          profilePic: data['profilePic'] || 'default',
          status: data['status'] ?? false,
        };
      });

      this.mentionableUsers = users;
    } catch (error) {
      console.error('Error fetching all users:', error);
    }
  }

  private async fetchAllChannels(): Promise<void> {
    try {
      const channelsCol = collection(this.firestore, 'channels');
      const snapshot = await getDocs(channelsCol);

      this.allChannels = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        name: docSnap.data()['name'] ?? 'Unnamed Channel',
      }));
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  }

  selectHashtagChannel(channelName: string): void {
    const textarea = this.chatField?.nativeElement;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBefore = this.chatMessage.slice(0, cursorPos);
    const textAfter = this.chatMessage.slice(cursorPos);

    const hashIndex = textBefore.lastIndexOf('#');
    if (hashIndex === -1) return;

    const newText =
      textBefore.slice(0, hashIndex) + `#${channelName} ` + textAfter;

    this.chatMessage = newText;

    const newCursorPos = hashIndex + channelName.length + 2;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });

    this.hashtagPopupVisible = false;
  }

  selectMentionUser(userName: string): void {
    const textarea = this.chatField?.nativeElement;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBefore = this.chatMessage.slice(0, cursorPos);
    const textAfter = this.chatMessage.slice(cursorPos);

    const atIndex = textBefore.lastIndexOf('@');
    if (atIndex === -1) return;

    const newText = textBefore.slice(0, atIndex) + `@${userName} ` + textAfter;

    this.chatMessage = newText;

    const newCursorPos = atIndex + userName.length + 2;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
    this.mentionPopupVisible = false;
  }

  async handleSearchFieldKey(event: KeyboardEvent): Promise<void> {
    setTimeout(() => {
      if (this.searchInput.includes('@')) {
        this.searchFieldMentionVisible = true;
        this.searchMentionUsers = this.mentionableUsers;
      } else {
        this.searchFieldMentionVisible = false;
      }

      if (this.searchInput.includes('#')) {
        this.searchFieldHashtagVisible = true;
        this.searchHashtagChannels = this.allChannels;
      } else {
        this.searchFieldHashtagVisible = false;
      }
    }, 0);
  }

  insertMentionInSearch(userName: string): void {
    const textarea = this.searchField.nativeElement;
    const cursorPos = textarea.selectionStart;
    const textBefore = this.searchInput.slice(0, cursorPos);
    const textAfter = this.searchInput.slice(cursorPos);

    const atIndex = textBefore.lastIndexOf('@');
    if (atIndex === -1) return;

    this.searchInput =
      textBefore.slice(0, atIndex) + `@${userName} ` + textAfter;

    const newCursorPos = atIndex + userName.length + 2;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });

    this.searchFieldMentionVisible = false;
  }

  insertHashtagInSearch(channelName: string): void {
    const textarea = this.searchField.nativeElement;
    const cursorPos = textarea.selectionStart;
    const textBefore = this.searchInput.slice(0, cursorPos);
    const textAfter = this.searchInput.slice(cursorPos);

    const hashIndex = textBefore.lastIndexOf('#');
    if (hashIndex === -1) return;

    this.searchInput =
      textBefore.slice(0, hashIndex) + `#${channelName} ` + textAfter;

    const newCursorPos = hashIndex + channelName.length + 2;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });

    this.searchFieldHashtagVisible = false;
  }
}
