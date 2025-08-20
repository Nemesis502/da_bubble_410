import { inject, Injectable, ElementRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';

// Dialog Components
import { MenuDialogComponent } from '../dialogs/menu-dialog/menu-dialog.component';
import { MemberDialogComponent } from '../dialogs/member-dialog/member-dialog.component';
import { ProfilDialogComponent } from '../dialogs/profil-dialog/profil-dialog.component';

// Other Services
import { MentionService } from './mentions.service';
import { appUser } from '../../interfaces/user.interface';

interface PickerPosition {
  top: number;
  left: number;
}

@Injectable({
  providedIn: 'root',
})
export class ChatUIService {
  private dialog = inject(MatDialog);
  private mentionService = inject(MentionService);

  // References to component's DOM elements and state
  private chatFieldRef!: ElementRef<HTMLTextAreaElement>;
  private componentElementRef!: ElementRef;
  private getChatMessage!: () => string;
  private setChatMessage!: (msg: string) => void;

  // UI State Subjects
  private _mentionPopupVisible = new BehaviorSubject<boolean>(false);
  mentionPopupVisible$ = this._mentionPopupVisible.asObservable();

  private _hashtagPopupVisible = new BehaviorSubject<boolean>(false);
  hashtagPopupVisible$ = this._hashtagPopupVisible.asObservable();

  private _filteredMentionableUsers = new BehaviorSubject<any[]>([]);
  filteredMentionableUsers$ = this._filteredMentionableUsers.asObservable();

  private _filteredChannels = new BehaviorSubject<any[]>([]);
  filteredChannels$ = this._filteredChannels.asObservable();

  private _emojiPickerVisible = new BehaviorSubject<boolean>(false);
  emojiPickerVisible$ = this._emojiPickerVisible.asObservable();

  private _pickerPosition = new BehaviorSubject<PickerPosition>({ top: 0, left: 0 });
  pickerPosition$ = this._pickerPosition.asObservable();

  private mentionableUsers: any[] = [];
  private allChannels: any[] = [];

  constructor() { }

  /**
   * Initializes the service with references to the component's DOM and state.
   * This is crucial for the service to interact with the component's input field.
   */
  init(
    chatField: ElementRef<HTMLTextAreaElement>,
    componentElement: ElementRef,
    getChatMessage: () => string,
    setChatMessage: (msg: string) => void
  ): void {
    console.log("was das: ",chatField);
    this.chatFieldRef = chatField;
    this.componentElementRef = componentElement;
    this.getChatMessage = getChatMessage;
    this.setChatMessage = setChatMessage;
  }

  // --- Dialog Functions ---
  openMenuDialog(): void {
    if (window.innerWidth < 800) {
      this.dialog.open(MenuDialogComponent, {
        position: { bottom: '0' },
        maxWidth: '100vw',
        width: '100vw',
        panelClass: 'bottom-dialog-panel',
        data: {
          source: 'main-menu',
        },
      });
    } else {
      this.dialog.open(MenuDialogComponent, {
        position: { top: '80px', right: '16px' },
        maxWidth: '282px',
        maxHeight: '181px',
        panelClass: 'top-right-dialog-panel',
        data: {
          source: 'main-menu',
        }
      });
    }
  }

  openMemberDialog(channelId: string): void {
    this.dialog.open(MemberDialogComponent, {
      position: { top: '122px' },
      width: '80vw',
      maxHeight: '75vh',
      panelClass: 'member-dialog',
      data: { source: 'channel-chat', channelId: channelId },
    });
  }

  openProfileDialog(user: appUser | null, loggedUserId: string | undefined): void {
    this.dialog.open(ProfilDialogComponent, {
      maxWidth: '90vw',
      panelClass: 'bottom-dialog-panel',
      data: { user: user, loggedUser: loggedUserId, isUser: false },
    });
  }

  // --- Mention & Hashtag Functions ---

  async handleChatInput(event: KeyboardEvent, chatMessage: string, channelId: string): Promise<void> {
    const char = event.key;
    this.setChatMessage(chatMessage); // Ensure service has latest message

    if (char === '@') {
      await this.handleMentionTrigger(channelId);
    } else if (char === '#') {
      this.handleHashtagTrigger();
    } else if ([' ', 'Enter', 'Escape'].includes(char)) {
      this.closeAllPopups();
    }

    setTimeout(() => {
      this.filterPopupLists();
      this.cleanupMentionAndHashtag();
    }, 0);
  }

  async fetchMentionableUsers(channelId: string): Promise<void> {
    if (!channelId) return;
    try {
      this.mentionableUsers = await this.mentionService.fetchMentionableUsers(channelId);
      this._filteredMentionableUsers.next(this.mentionableUsers); // Update filtered list initially
    } catch (error) {
      console.error('Error fetching mentionable users:', error);
    }
  }

  async fetchAllChannels(): Promise<void> {
    try {
      this.allChannels = await this.mentionService.fetchAllChannels();
      this._filteredChannels.next(this.allChannels); // Update filtered list initially
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  }

  private filterMentionableUsers(term: string): void {
    this._filteredMentionableUsers.next(this.mentionService.filterUsers(this.mentionableUsers, term));
  }

  private filterChannels(term: string): void {
    this._filteredChannels.next(this.mentionService.filterChannels(this.allChannels, term));
  }

  selectMentionUser(userName: string): void {
    const textarea = this.chatFieldRef?.nativeElement;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBefore = this.getChatMessage().slice(0, cursorPos);
    const textAfter = this.getChatMessage().slice(cursorPos);

    const atIndex = textBefore.lastIndexOf('@');
    if (atIndex === -1) return;

    const newText = textBefore.slice(0, atIndex) + `@${userName} ` + textAfter;
    this.setChatMessage(newText);

    const newCursorPos = atIndex + userName.length + 2;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
    this._mentionPopupVisible.next(false);
  }

  selectHashtagChannel(channelName: string): void {
    const textarea = this.chatFieldRef?.nativeElement;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBefore = this.getChatMessage().slice(0, cursorPos);
    const textAfter = this.getChatMessage().slice(cursorPos);

    const hashIndex = textBefore.lastIndexOf('#');
    if (hashIndex === -1) return;

    const newText = textBefore.slice(0, hashIndex) + `#${channelName} ` + textAfter;
    this.setChatMessage(newText);

    const newCursorPos = hashIndex + channelName.length + 2;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
    this._hashtagPopupVisible.next(false);
  }

  private getCurrentTriggerTerm(triggerChar: '@' | '#'): string | null {
    const textarea = this.chatFieldRef?.nativeElement;
    if (!textarea) return null;
    const cursorPos = textarea.selectionStart;
    return this.mentionService.getCurrentTriggerTerm(this.getChatMessage(), cursorPos, triggerChar);
  }

  async triggerMention(channelId: string): Promise<void> {
    const textarea = this.chatFieldRef?.nativeElement;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBefore = this.getChatMessage().slice(0, cursorPos);
    const charBefore = textBefore.charAt(textBefore.length - 1);

    if (charBefore === '@') {
      this.removeMentionSymbol(cursorPos);
    } else {
      this.insertMentionSymbol(cursorPos);
      await this.fetchMentionableUsers(channelId); 
    }
  }

  private insertMentionSymbol(cursorPos: number): void {
    const textarea = this.chatFieldRef?.nativeElement;
    if (!textarea) return;

    const textBefore = this.getChatMessage().slice(0, cursorPos);
    const textAfter = this.getChatMessage().slice(cursorPos);

    this.setChatMessage(`${textBefore}@${textAfter}`);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos + 1, cursorPos + 1);
    }, 0);
    this._mentionPopupVisible.next(true);
  }

  private removeMentionSymbol(cursorPos: number): void {
    const textarea = this.chatFieldRef?.nativeElement;
    if (!textarea) return;

    const textBefore = this.getChatMessage().slice(0, cursorPos - 1);
    const textAfter = this.getChatMessage().slice(cursorPos);

    this.setChatMessage(`${textBefore}${textAfter}`);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos - 1, cursorPos - 1);
    }, 0);
    this._mentionPopupVisible.next(false);
  }

  private async handleMentionTrigger(channelId: string): Promise<void> {
    this._mentionPopupVisible.next(true);
    await this.fetchMentionableUsers(channelId);
  }

  private handleHashtagTrigger(): void {
    this._hashtagPopupVisible.next(true);
  }

  private closeAllPopups(): void {
    this._mentionPopupVisible.next(false);
    this._hashtagPopupVisible.next(false);
  }

  private cleanupMentionAndHashtag(): void {
    if (!this.getChatMessage().includes('@')) {
      this._mentionPopupVisible.next(false);
    }
    if (!this.getChatMessage().includes('#')) {
      this._hashtagPopupVisible.next(false);
    }
  }

  private filterPopupLists(): void {
    if (this._mentionPopupVisible.getValue()) {
      const term = this.getCurrentTriggerTerm('@');
      if (term !== null) {
        this.filterMentionableUsers(term);
      } else {
        this._filteredMentionableUsers.next(this.mentionableUsers);
      }
    }

    if (this._hashtagPopupVisible.getValue()) {
      const term = this.getCurrentTriggerTerm('#');
      if (term !== null) {
        this.filterChannels(term);
      } else {
        this._filteredChannels.next(this.allChannels);
      }
    }
  }

  // --- Emoji Picker Functions ---
  toggleEmojiPicker(event: MouseEvent): void {
    event.stopPropagation();
    const currentVisibility = this._emojiPickerVisible.getValue();
    this._emojiPickerVisible.next(!currentVisibility);

    if (!currentVisibility) {
      const buttonRect = (event.target as HTMLElement).getBoundingClientRect();
      this._pickerPosition.next({
        top: buttonRect.bottom + window.scrollY,
        left: buttonRect.left + window.scrollX,
      });
    }
  }

  addEmoji(emoji: string): void {
    console.log(this.chatFieldRef);
    
    if (this.chatFieldRef) {
      const textarea = this.chatFieldRef.nativeElement;
      const cursorPos = textarea.selectionStart;
      const textBefore = this.getChatMessage().slice(0, cursorPos);
      const textAfter = this.getChatMessage().slice(cursorPos);
      this.setChatMessage(`${textBefore}${emoji}${textAfter}`);
      textarea.focus();
      setTimeout(() => {
        textarea.setSelectionRange(
          cursorPos + emoji.length,
          cursorPos + emoji.length
        );
      }, 0);
    }
  }

  onPickerClosed(): void {
    this._emojiPickerVisible.next(false);
  }

  onDocumentClick(event: MouseEvent): void {
    const pickerElement = this.componentElementRef.nativeElement.querySelector(
      '.emoji-picker-panel'
    );
    const buttonElement =
      this.componentElementRef.nativeElement.querySelector('.chat-buttons');

    if (
      pickerElement &&
      !pickerElement.contains(event.target as Node) &&
      buttonElement &&
      !buttonElement.contains(event.target as Node)
    ) {
      this._emojiPickerVisible.next(false);
    }
  }
}
