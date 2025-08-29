import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, startWith } from 'rxjs';
import { ChatService } from './chat.service';
import { ChatUIService } from './chat-ui.service';
import { appUser } from '../../interfaces/user.interface';

@Injectable({ providedIn: 'root' })
export class ChatSubscriptionsService {
  threadMessages$: Observable<any[]>;
  messages$: Observable<any[]>;
  selectedChannel$: Observable<any>;
  otherUser$: Observable<appUser | null>;
  activeThreadMessage$: Observable<any>;
  mentionPopupVisible$: Observable<boolean>;
  hashtagPopupVisible$: Observable<boolean>;
  filteredMentionableUsers$: Observable<any[]>;
  filteredChannels$: Observable<any[]>;
  emojiPickerVisible$: Observable<boolean>;
  pickerPosition$: Observable<{ top: number; left: number }>;

  constructor(private chatService: ChatService, private chatUI: ChatUIService) {
    this.threadMessages$ = this.chatService.threadMessages$.pipe(
      map((msgs) => msgs ?? []),
      startWith([])
    );
    this.messages$ = this.chatService.messages$;
    this.selectedChannel$ = this.chatService.selectedChannel$;
    this.otherUser$ = this.chatService.otherUser$;
    this.activeThreadMessage$ = this.chatService.activeThreadMessage$;
    this.mentionPopupVisible$ = this.chatUI.mentionPopupVisible$;
    this.hashtagPopupVisible$ = this.chatUI.hashtagPopupVisible$;
    this.filteredMentionableUsers$ = this.chatUI.filteredMentionableUsers$;
    this.filteredChannels$ = this.chatUI.filteredChannels$;
    this.emojiPickerVisible$ = this.chatUI.emojiPickerVisible$;
    this.pickerPosition$ = this.chatUI.pickerPosition$;
  }

  // This function handles all subscriptions
  public subscribeAll(
    handlers: {
      onMessages?: (msgs: any[]) => void;
      onThreadMessages?: (msgs: any[]) => void;
      onSelectedChannel?: (c: any) => void;
      onOtherUser?: (u: any) => void;
      onActiveThreadMessage?: (msg: any) => void;
      onMentionPopupVisible?: (val: boolean) => void;
      onHashtagPopupVisible?: (val: boolean) => void;
      onFilteredMentionableUsers?: (val: any[]) => void;
      onFilteredChannels?: (val: any[]) => void;
      onEmojiPickerVisible?: (val: boolean) => void;
      onPickerPosition?: (val: { top: number; left: number }) => void;
    }
  ) {
    this.messages$.subscribe(handlers.onMessages);
    this.threadMessages$.subscribe(handlers.onThreadMessages);
    this.selectedChannel$.subscribe(handlers.onSelectedChannel);
    this.otherUser$.subscribe(handlers.onOtherUser);
    this.activeThreadMessage$.subscribe(handlers.onActiveThreadMessage);
    this.mentionPopupVisible$.subscribe(handlers.onMentionPopupVisible);
    this.hashtagPopupVisible$.subscribe(handlers.onHashtagPopupVisible);
    this.filteredMentionableUsers$.subscribe(handlers.onFilteredMentionableUsers);
    this.filteredChannels$.subscribe(handlers.onFilteredChannels);
    this.emojiPickerVisible$.subscribe(handlers.onEmojiPickerVisible);
    this.pickerPosition$.subscribe(handlers.onPickerPosition);
  }

  // Optional helper to fetch all chat-related data
  fetchChannelMembers(chatId: string, firestoreService: any) {
    return firestoreService.getChannelMembers(chatId);
  }
}
