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
import { MessageTemplateComponent } from '../message-template/message-template.component';
import { EmojiPickerComponent } from '../emoji-picker/emoji-picker.component';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  serverTimestamp,
} from '@angular/fire/firestore';
import { appUser } from '../../interfaces/user.interface';
import { SessionService } from '../../shared/services/currentUserSession.service';
import { updateDoc } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { MenuDialogComponent } from '../../shared/dialogs/menu-dialog/menu-dialog.component';
import { MemberDialogComponent } from '../../shared/dialogs/member-dialog/member-dialog.component';
import { ProfilDialogComponent } from '../../shared/dialogs/profil-dialog/profil-dialog.component';

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

],
  templateUrl: './chat-template.component.html',
  styleUrl: './chat-template.component.scss',
})
export class ChatTemplateComponent implements OnInit {
  userSession = inject(SessionService);
  dialog = inject(MatDialog);

  @ViewChild('chatField') chatField!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('chatBody') private chatBodyRef!: ElementRef;

  mentionableUsers: {
    id: string;
    userName: string;
    profilePic: string;
    status: boolean;
  }[] = [];

  allChannels: { id: string; name: string }[] = [];

  mentionPopupVisible = false;
  hashtagPopupVisible: boolean = false;
  filteredMentionableUsers = this.mentionableUsers;
  filteredChannels = this.allChannels;

  selectedChannel: any = null;
  chatMessage: string = '';
  messages: any[] = [];
  currentUser: appUser | null = null;
  otherUser: appUser | null = null;

  emojiPickerVisible: boolean = false;
  pickerPosition: PickerPosition = { top: 0, left: 0 };

  editedMessage: any = null;
  chatIsChannel: boolean = false;
  chatIsConversation: boolean = false;
  chatIsThread: boolean = false;
  activeThreadMessageId: string = '';
  threadMessages$: Observable<any[] | null> = of(null);
  activeThreadMessage: any | null = null;
  messageCollection: any;
  
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private elementRef: ElementRef,
    private channelService: ChannelsDirectMessageService,
    private firestore: Firestore
  ) { }

  async ngOnInit(): Promise<void> {
    this.currentUser = this.userSession.getCurrentUser();

   this.route.paramMap.subscribe(async params => {
  const id = params.get('id');
  if (id) {
    await this.initializeChannelFromRoute(id);
  }
});

    await this.fetchAllChannels();
    console.log(this.selectedChannel);


    // debugger
    // this.channelService.selectedChannel$.subscribe(async (channelOrConversation) => {
    //   console.log("channel or Conversation", channelOrConversation);
    //   this.selectedChannel = channelOrConversation;
    //   console.log("Selected Channel", this.selectedChannel);

    //   this.messages = [];

    //   if (!channelOrConversation) return;

    //   if (this.isChannel(channelOrConversation)) {
    //     this.chatIsChannel = true;
    //     this.chatIsConversation = false;
    //     await this.loadMessagesForChannel(channelOrConversation);
    //   } else if (this.isConversation(channelOrConversation)) {
    //     this.chatIsChannel = false;
    //     this.chatIsConversation = true;
    //     await this.loadMessagesForConversation(channelOrConversation.channelId);
    //   }
    // });
    // this.channelService.selectedDirectMessage$.subscribe(async (channelOrConversation) => {
    //   console.log("channel or Conversation", channelOrConversation);
    //   this.selectedChannel = channelOrConversation;
    //   console.log("Selected Channel", this.selectedChannel);

    //   this.messages = [];

    //   if (!channelOrConversation) return;

    //   if (this.isChannel(channelOrConversation)) {
    //     this.chatIsChannel = true;
    //     this.chatIsConversation = false;
    //     await this.loadMessagesForChannel(channelOrConversation);
    //   } else if (this.isConversation(channelOrConversation)) {
    //     this.chatIsChannel = false;
    //     this.chatIsConversation = true;
    //     await this.loadMessagesForConversation(this.selectedChannel);
    //   }
    // });
  }




  private isChannel(obj: any): boolean {
    return obj && obj.type === 'channel';
  }

  private isConversation(obj: any): boolean {
    return obj && obj.type === 'conversation';
  }

private async initializeChannelFromRoute(id: string): Promise<void>{
    if (!id) return;

    try {
      const channelDocRef = doc(this.firestore, `channels/${id}`);
      const channelSnap = await getDoc(channelDocRef);

      if (channelSnap.exists()) {
        const channel = await this.resolveChannelById(id);
        if (channel) {
          this.chatIsConversation = false;
          this.chatIsChannel = true;
          this.setActiveChannel(channel);
        }
        return;
      }

      const convDocRef = doc(this.firestore, `conversations/${id}`);
      const convSnap = await getDoc(convDocRef);

      if (convSnap.exists()) {
        this.chatIsConversation = true;
        this.selectedChannel = id
        console.log(this.selectedChannel);
        await this.handleConversationSetup(id);
        return;
      }

      console.warn('Neither channel nor conversation found for ID:', id);
    } catch (error) {
      console.error('Error resolving channel/conversation:', error);
    }
  }

  private async handleConversationSetup(conversationId: string): Promise<void> {
    console.log(conversationId);

    try {
      const convDocRef = doc(this.firestore, `conversations/${conversationId}`);
      const convSnap = await getDoc(convDocRef);

      if (!convSnap.exists()) {
        console.warn('Conversation not found:', conversationId);
        return;
      }

      const data = convSnap.data();
      const participants: string[] = data['participants'] || [];

      const currentUserId = this.currentUser?.id;
      if (!currentUserId) {
        console.warn('Current user not available');
        return;
      }

      const otherUserId = participants.find((id) => id !== currentUserId);
      if (!otherUserId) {
        console.warn('No other user in conversation');
        return;
      }

      await this.fetchOtherUserInfo(otherUserId);

      this.selectedChannel = { channelId: conversationId };
      console.log(this.selectedChannel);

      this.loadMessagesForConversation(conversationId);
      this.chatIsChannel = false;
      console.log('Conversation setup complete. Other user:', this.otherUser);
    } catch (error) {
      console.error('Error during conversation setup:', error);
    }
  }

  private loadMessagesForConversation(conversationId: string): void {
    console.log(conversationId);

    this.channelService
      .getEnrichedConversationMessages(conversationId)
      .subscribe({
        next: (messages) => {
          this.messages = messages;
          this.scrollToBottom();
          this.focusChatInput();
          console.log('Loaded messages:', this.messages);
        },
        error: (error) => {
          console.error('Error loading enriched conversation messages:', error);
        },
      });
  }

  private async fetchOtherUserInfo(userId: string): Promise<void> {
    try {
      const userDocRef = doc(this.firestore, `users/${userId}`);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        console.warn(`User document not found for ID: ${userId}`);
        this.otherUser = null;
        return;
      }

      const data = userSnap.data();

      this.otherUser = {
        id: userId,
        userName: data['userName'] || 'Unknown',
        profilePic: data['profilePic'],
        status: data['status'] ?? false,
        email: data['email'] || '',
      };
    } catch (error) {
      console.error('Error fetching other user info:', error);
      this.otherUser = null;
    }
  }

  private getChannelIdFromRoute(): string | null {
    const channelId = this.route.snapshot.paramMap.get('id');
    if (!channelId) {
      console.warn('No channel ID in route');
    }
    return channelId;
  }

  private async resolveChannelById(channelId: string): Promise<any | null> {
    const knownChannels = this.channelService.getChannels();
    const matchedChannel = knownChannels.find((c) => c.channelId === channelId);

    if (matchedChannel) {
      return matchedChannel;
    }

    return await this.channelService.getChannelById(channelId);
  }

  private setActiveChannel(channel: any): void {
    this.selectedChannel = channel;
    this.channelService.setSelectedChannel(channel);
    this.loadMessagesForChannel(channel);
  }

  loadMessagesForChannel(channel: any): void {
    if (channel?.channelId) {
      this.channelService.getEnrichedMessages(channel.channelId).subscribe({
        next: (messages) => {
          this.messages = messages;
          this.scrollToBottom();
          this.focusChatInput();
        },
        error: (error) => {
          console.error('Error loading messages:', error);
        },
      });
    }
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
    // debugger
    console.log(this.selectedChannel);
    console.log(this.chatIsConversation);


    const messageText = this.chatMessage.trim();
    const channelId = this.selectedChannel?.channelId;
    const userId = this.currentUser?.id;
    if (!messageText || !channelId || !userId) return;

    try {
      if (this.editedMessage) {
        if (this.chatIsThread) {
          await this.updateThreadMessage(channelId, messageText);
        } else {
          await this.updateExistingMessage(channelId, messageText);
        }
      } else if (this.chatIsThread && this.activeThreadMessageId) {
        await this.sendThreadMessage(channelId, messageText, userId);
      } else {
        await this.createNewMessage(channelId, messageText, userId);
      }

      this.afterMessageSend();
    } catch (error) { }
  }

  private async updateThreadMessage(
    channelId: string,
    messageText: string
  ): Promise<void> {
    if (!this.editedMessage?.id || !this.activeThreadMessageId) return;

    const messageRef = doc(
      this.firestore,
      `channels/${channelId}/messages/${this.activeThreadMessageId}/threadMessages/${this.editedMessage.id}`
    );

    await updateDoc(messageRef, { text: messageText });

    this.editedMessage = null;
    this.loadThreadMessages();
  }

  private async sendThreadMessage(
    channelId: string,
    messageText: string,
    userId: string
  ): Promise<void> {
    await this.channelService.sendThreadMessage(
      channelId,
      this.activeThreadMessageId,
      messageText,
      userId
    );
    this.loadThreadMessages();
  }

  private async updateExistingMessage(
    channelId: string,
    messageText: string
  ): Promise<void> {
    if (!this.editedMessage?.id) return;

    const messageRef = doc(
      this.firestore,
      `channels/${channelId}/messages/${this.editedMessage.id}`
    );

    await updateDoc(messageRef, { text: messageText });
    console.log('Message updated successfully:', messageText);

    this.editedMessage = null;
  }

  private async createNewMessage(
    channelId: string,
    messageText: string,
    userId: string): Promise<void> {
    if (this.chatIsConversation) {
      this.messageCollection = collection(
        this.firestore,
        `conversations/${channelId}/directMessages`);
    } else {
      this.messageCollection = collection(
        this.firestore,
        `channels/${channelId}/messages`
      );
    }
    await this.sendMessageInConversation(messageText, userId, channelId)
  }

  async sendMessageInConversation(messageText: string, userId: string, channelId: string) {
    const newMessage = {
      text: messageText,
      timestamp: serverTimestamp(),
      senderID: userId,
      channelId: channelId,
    };
    await addDoc(this.messageCollection, newMessage);
    console.log('Message sent successfully:', newMessage);
  }

  private afterMessageSend(): void {
    this.chatMessage = '';
  }

  startEditingMessage(message: any): void {
    this.chatMessage = message.text;
    this.editedMessage = message;
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

  openChannelInfo(): void {
    const channelId = this.selectedChannel?.channelId;
    if (!channelId) {
      console.warn('Kein Channel ausgewählt');
      return;
    }

    this.router.navigate(['/channel-info', channelId]);
  }

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

    setTimeout(() => {
      this.filterPopupLists();
      this.cleanupMentionAndHashtag();
    }, 0);
  }

  private filterPopupLists(): void {
    if (this.mentionPopupVisible) {
      const term = this.getCurrentTriggerTerm('@');
      if (term !== null) {
        this.filterMentionableUsers(term);
      } else {
        this.filteredMentionableUsers = this.mentionableUsers;
      }
    }

    if (this.hashtagPopupVisible) {
      const term = this.getCurrentTriggerTerm('#');
      if (term !== null) {
        this.filterChannels(term);
      } else {
        this.filteredChannels = this.allChannels;
      }
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
    if (!this.selectedChannel?.channelId) return;

    try {
      const channelDocRef = doc(
        this.firestore,
        `channels/${this.selectedChannel.channelId}`
      );
      const channelDocSnap = await getDoc(channelDocRef);

      if (!channelDocSnap.exists()) {
        console.warn('Channel document does not exist');
        return;
      }

      const channelData = channelDocSnap.data();
      const memberIds: string[] = channelData['members'] || [];

      const userPromises = memberIds.map(async (userId) => {
        const userDocSnap = await getDoc(
          doc(this.firestore, `users/${userId}`)
        );
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          return {
            id: userId,
            userName: data['userName'],
            profilePic: data['profilePic'] || 'default',
            status: data['status'] ?? false,
          };
        }
        return null;
      });

      const users = (await Promise.all(userPromises)).filter(Boolean);

      this.mentionableUsers = users as {
        id: string;
        userName: string;
        profilePic: string;
        status: boolean;
      }[];
    } catch (error) {
      console.error('Error fetching mentionable users:', error);
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

  handleReplyToMessage(messageId: string): void {
    this.chatIsThread = true;
    this.chatIsChannel = false;
    this.activeThreadMessageId = messageId;
    this.loadThreadMessages();
    this.setActiveThreadMessage(messageId);

    setTimeout(() => {
      this.scrollToBottom();
    }, 100);
  }

  loadThreadMessages(): void {
    const channelId = this.selectedChannel?.channelId;
    const messageId = this.activeThreadMessageId;

    if (!channelId || !messageId) return;

    this.channelService
      .getEnrichedThreadMessages(channelId, messageId)
      .subscribe((messages) => {
        this.threadMessages$ = of(messages);
      });

    const docRef = doc(
      this.firestore,
      `channels/${channelId}/messages/${messageId}`
    );
    getDoc(docRef).then((docSnap) => {
      if (docSnap.exists()) {
        const rawMsg = { id: docSnap.id, ...docSnap.data() };
        this.channelService
          .enrichMessage(channelId, rawMsg)
          .subscribe((enrichedMsg) => {
            this.activeThreadMessage = enrichedMsg;
          });
      } else {
        this.activeThreadMessage = null;
      }
    });
  }

  async setActiveThreadMessage(messageId: string) {
    this.activeThreadMessageId = messageId;

    if (!this.selectedChannel?.channelId) {
      this.activeThreadMessage = null;
      return;
    }

    const docRef = doc(
      this.firestore,
      `channels/${this.selectedChannel.channelId}/messages/${messageId}`
    );

    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      this.activeThreadMessage = { id: docSnap.id, ...docSnap.data() };
    } else {
      this.activeThreadMessage = null;
    }
  }

  openMenuDialog(): void {
    this.dialog.open(MenuDialogComponent, {
      position: { bottom: '0' },
      maxWidth: '100vw',
      width: '100vw',
      panelClass: 'bottom-dialog-panel',
      data: {
        source: 'main-menu',
      },
    });
  }
  openMemberDialog(): void {
    this.dialog.open(MemberDialogComponent, {
      position: { top: '122px' },
      width: '80vw',
      maxHeight: '75vh',
      panelClass: 'member-dialog',
      data: {
        source: 'channel-chat',
        channelId: this.selectedChannel?.channelId,
      },
    });
  }

  closeThreadView(): void {
    this.chatIsThread = false;
    this.chatIsChannel = true;
    const channelId = this.selectedChannel?.channelId;
    if (channelId) {
      this.router.navigate([`/chat/${channelId}`]);
    }
  }

  private getCurrentTriggerTerm(triggerChar: '@' | '#'): string | null {
    const textarea = this.chatField?.nativeElement;
    if (!textarea) return null;

    const cursorPos = textarea.selectionStart;
    const textBefore = this.chatMessage.slice(0, cursorPos);

    const lastTriggerIndex = textBefore.lastIndexOf(triggerChar);
    if (lastTriggerIndex === -1) return null;

    const term = textBefore.slice(lastTriggerIndex + 1);

    if (term.includes(' ') || term.includes('@') || term.includes('#')) {
      return null;
    }

    return term.toLowerCase();
  }

  private filterMentionableUsers(term: string): void {
    this.filteredMentionableUsers = this.mentionableUsers.filter(user =>
      user.userName.toLowerCase().includes(term)
    );
  }

  private filterChannels(term: string): void {
    this.filteredChannels = this.allChannels.filter(channel =>
      channel.name.toLowerCase().includes(term)
    );
  }

openProfileDialogOtherUser(): void {
  this.dialog.open(ProfilDialogComponent, {
    maxWidth: '90vw',
    panelClass: 'bottom-dialog-panel',
    data: {
      user: this.otherUser,
      loggedUser: this.currentUser?.id,
      isUser: false
    }
  });
}

}
