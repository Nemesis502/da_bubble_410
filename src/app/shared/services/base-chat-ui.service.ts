import { inject, Injectable, ElementRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';
import { MenuDialogComponent } from '../dialogs/menu-dialog/menu-dialog.component';
import { MemberDialogComponent } from '../dialogs/member-dialog/member-dialog.component';
import { ProfilDialogComponent } from '../dialogs/profil-dialog/profil-dialog.component';
import { MentionService } from './mentions.service';
import { appUser } from '../../interfaces/user.interface';

interface PickerPosition {
  top: number;
  left: number;
}

@Injectable({ providedIn: 'root' })
export class BaseChatUIService {
  // Injecting dialog service and mention service
  protected dialog = inject(MatDialog);
  protected mentionService = inject(MentionService);

  // References to input field and component DOM
  protected chatFieldRef!: ElementRef<HTMLTextAreaElement>;
  protected componentElementRef!: ElementRef;
  protected getChatMessage!: () => string;
  protected setChatMessage!: (msg: string) => void;

  // UI state observables
  protected _mentionPopupVisible = new BehaviorSubject<boolean>(false);
  mentionPopupVisible$ = this._mentionPopupVisible.asObservable();

  protected _hashtagPopupVisible = new BehaviorSubject<boolean>(false);
  hashtagPopupVisible$ = this._hashtagPopupVisible.asObservable();

  protected _filteredMentionableUsers = new BehaviorSubject<any[]>([]);
  filteredMentionableUsers$ = this._filteredMentionableUsers.asObservable();

  protected _filteredChannels = new BehaviorSubject<any[]>([]);
  filteredChannels$ = this._filteredChannels.asObservable();

  protected _emojiPickerVisible = new BehaviorSubject<boolean>(false);
  emojiPickerVisible$ = this._emojiPickerVisible.asObservable();

  protected _pickerPosition = new BehaviorSubject<PickerPosition>({
    top: 0,
    left: 0,
  });
  pickerPosition$ = this._pickerPosition.asObservable();

  // Local data caches
  protected mentionableUsers: any[] = [];
  protected allChannels: any[] = [];
  protected _activeChatFieldRef: ElementRef<HTMLTextAreaElement> | null = null;
  protected _activeMessageGetter: (() => string) | null = null;
  protected _activeMessageSetter: ((msg: string) => void) | null = null;

  constructor() {}

  // ------------------- Initialization -------------------
  // Initializes references to DOM elements and getter/setter functions for chat input
  init(
    chatField: ElementRef<HTMLTextAreaElement>,
    componentElement: ElementRef,
    getChatMessage: () => string,
    setChatMessage: (msg: string) => void
  ) {
    this.chatFieldRef = chatField;
    this.componentElementRef = componentElement;
    this.getChatMessage = getChatMessage;
    this.setChatMessage = setChatMessage;
  }

  // Sets context for active chat field (used for emoji insertion, mentions, etc.)
  setChatContext(
    chatFieldRef: ElementRef<HTMLTextAreaElement>,
    getMessage: () => string,
    setMessage: (msg: string) => void
  ) {
    this._activeChatFieldRef = chatFieldRef;
    this._activeMessageGetter = getMessage;
    this._activeMessageSetter = setMessage;
  }

  // ------------------- Dialogs -------------------
  // Opens the main menu dialog, positioned differently for mobile vs desktop
  openMenuDialog(): void {
    const isMobile = window.innerWidth < 1300;

    const config = {
      position: isMobile ? { bottom: '0' } : { top: '80px', right: '16px' },
      maxWidth: isMobile ? '100vw' : '282px',
      width: isMobile ? '100vw' : undefined,
      maxHeight: isMobile ? undefined : '181px',
      panelClass: isMobile ? 'bottom-dialog-panel' : 'top-right-dialog-panel',
      data: { source: 'main-menu' },
    };

    this.dialog.open(MenuDialogComponent, config);
  }

  // Opens the member dialog for a channel or "add members" flow
  openMemberDialog(
    channelId: string,
    source: 'channel-chat' | 'add-members' = 'channel-chat',
    positionOffset?: { top: string; right: string }
  ) {
    const isMobile = window.innerWidth < 1300;
    this.dialog.open(MemberDialogComponent, {
      width: '415px',
      maxHeight: '75vh',
      panelClass: 'member-dialog',
      data: { source, channelId },
      position: isMobile
        ? undefined
        : positionOffset || { top: '190px', right: '100px' },
    });
  }

  // Opens the profile dialog for a given user
  openProfileDialog(user: appUser | null, loggedUserId?: string): void {
    this.dialog.open(ProfilDialogComponent, {
      maxWidth: '90vw',
      panelClass: 'bottom-dialog-panel',
      data: { user, loggedUser: loggedUserId, isUser: false },
    });
  }

  // ------------------- Mentions / Hashtags -------------------
  // Handles keyboard input and triggers popups for mentions/hashtags
  async handleChatInput(
    event: KeyboardEvent,
    chatMessage: string,
    channelId: string
  ) {
    this.setChatMessage(chatMessage);

    const key = event.key;
    if (key === '@') await this.handleMentionTrigger(channelId);
    else if (key === '#') this.handleHashtagTrigger();
    else if ([' ', 'Enter', 'Escape'].includes(key)) this.closeAllPopups();

    setTimeout(() => {
      this.filterPopupLists();
      this.cleanupMentionAndHashtag();
    });
  }

  // Fetch mentionable users for a channel and update observable
  async fetchMentionableUsers(channelId: string) {
    try {
      this.mentionableUsers = await this.mentionService.fetchMentionableUsers(
        channelId
      );
      this._filteredMentionableUsers.next(this.mentionableUsers);
    } catch {}
  }

  // Fetch all channels and update observable
  async fetchAllChannels() {
    try {
      this.allChannels = await this.mentionService.fetchAllChannels();
      this._filteredChannels.next(this.allChannels);
    } catch {}
  }

  // Generic function to insert a trigger (mention or hashtag)
  private insertTrigger(trigger: '@' | '#',value: string,popup: BehaviorSubject<boolean>) {
    const textarea = this.chatFieldRef?.nativeElement;
    if (!textarea) return;
    const index = this.getChatMessage().lastIndexOf(
      trigger,
      textarea.selectionStart - 1
    );
    if (index === -1) return;
    this.setChatMessage(
      this.getChatMessage().slice(0, index) +
        `${trigger}${value} ` +
        this.getChatMessage().slice(textarea.selectionStart)
    );
    setTimeout(() => {
      textarea.focus();
      const pos = index + value.length + 2;
      textarea.setSelectionRange(pos, pos);
    });
    popup.next(false);
  }

  // Insert selected mention into chat input
  selectMentionUser(userName: string) {
    this.insertTrigger('@', userName, this._mentionPopupVisible);
  }

  // Insert selected hashtag into chat input
  selectHashtagChannel(channelName: string) {
    this.insertTrigger('#', channelName, this._hashtagPopupVisible);
  }

  // Returns the current term after the trigger character (@ or #)
  private getCurrentTriggerTerm(triggerChar: '@' | '#'): string | null {
    const textarea = this.chatFieldRef?.nativeElement;
    if (!textarea) return null;
    const cursorPos = textarea.selectionStart;
    return this.mentionService.getCurrentTriggerTerm(
      this.getChatMessage(),
      cursorPos,
      triggerChar
    );
  }

  // Triggers mention logic: inserts @ or removes it
  async triggerMention(channelId: string) {
    const textarea = this.chatFieldRef?.nativeElement;
    if (!textarea) return;
    const cursorPos = textarea.selectionStart;
    const textBefore = this.getChatMessage().slice(0, cursorPos);
    const charBefore = textBefore.charAt(textBefore.length - 1);

    if (charBefore === '@') this.removeMentionSymbol(cursorPos);
    else {
      this.insertMentionSymbol(cursorPos);
      await this.fetchMentionableUsers(channelId);
    }
  }

  // Insert @ symbol at current cursor position
  private insertMentionSymbol(cursorPos: number) {
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

  // Remove @ symbol at current cursor position
  private removeMentionSymbol(cursorPos: number) {
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

  // Handles the @ mention trigger popup
  private async handleMentionTrigger(channelId: string) {
    this._mentionPopupVisible.next(true);
    await this.fetchMentionableUsers(channelId);
  }

  // Handles the # hashtag trigger popup
  private handleHashtagTrigger() {
    this._hashtagPopupVisible.next(true);
  }

  // Closes all popups
  private closeAllPopups() {
    this._mentionPopupVisible.next(false);
    this._hashtagPopupVisible.next(false);
  }

  // Cleans up popups if no triggers remain in input
  private cleanupMentionAndHashtag() {
    if (!this.getChatMessage().includes('@'))
      this._mentionPopupVisible.next(false);
    if (!this.getChatMessage().includes('#'))
      this._hashtagPopupVisible.next(false);
  }

  // Filters mention and hashtag lists based on current trigger term
private filterPopupLists() {
  const updateList = (popup: BehaviorSubject<boolean>, items: any[], trigger: '@' | '#', setter: BehaviorSubject<any[]>) => {
    if (!popup.getValue()) return;
    const term = this.getCurrentTriggerTerm(trigger);
    setter.next(term ? this.mentionService[`filter${trigger === '@' ? 'Users' : 'Channels'}`](items, term) : items);
  };

  updateList(this._mentionPopupVisible, this.mentionableUsers, '@', this._filteredMentionableUsers);
  updateList(this._hashtagPopupVisible, this.allChannels, '#', this._filteredChannels);
}

  // ------------------- Emoji Picker -------------------
  // Toggles emoji picker visibility and calculates position
  toggleEmojiPicker(event: MouseEvent) {
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

  // Adds an emoji to the active chat field at cursor position
addEmoji(emoji: string) {
  const textarea = this._activeChatFieldRef?.nativeElement;
  const get = this._activeMessageGetter;
  const set = this._activeMessageSetter;
  if (!textarea || !get || !set) return;

  const pos = textarea.selectionStart;
  set(`${get().slice(0, pos)}${emoji}${get().slice(pos)}`);
  textarea.focus();

  setTimeout(() => textarea.setSelectionRange(pos + emoji.length, pos + emoji.length));
}


  // Closes emoji picker
  onPickerClosed() {
    this._emojiPickerVisible.next(false);
  }

  // Closes emoji picker when clicking outside of picker or buttons
  onDocumentClick(event: MouseEvent) {
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
