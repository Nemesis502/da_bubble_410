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
import { ChannelInfoComponent } from '../channel-info/channel-info.component';
import { MentionService } from '../../shared/services/mentions.service';

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
  isChannelInfoOpen: boolean = false;

  constructor(
    private mentionService: MentionService,
    private router: Router,
    private route: ActivatedRoute,
    private elementRef: ElementRef,
    private channelService: ChannelsDirectMessageService,
    private firestore: Firestore
  ) {}

  /**Initialization Functions */

  /** Lifecycle hook that runs on component initialization.
   *  - Fetches current user session
   *  - Loads the route channel/conversation
   *  - Fetches available channels
   */
  async ngOnInit(): Promise<void> {
    this.currentUser = this.userSession.getCurrentUser();

    this.route.paramMap.subscribe(async (params) => {
      const id = params.get('id');
      if (id) {
        await this.initializeChannelFromRoute(id);
      }
    });

    await this.fetchAllChannels();
  }

  /** Resolves whether the provided ID in the route is a channel or a conversation.
   *  - Loads appropriate data and sets flags accordingly.
   */
  private async initializeChannelFromRoute(id: string): Promise<void> {
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
        this.selectedChannel = id;
        this.chatIsChannel = false;
        this.selectedChannel = id;
        console.log(this.selectedChannel);
        await this.handleConversationSetup(id);
        return;
      }

      console.warn('Neither channel nor conversation found for ID:', id);
    } catch (error) {
      console.error('Error resolving channel/conversation:', error);
    }
  }

  /** Sets up conversation by:
   *  - Resolving participants
   *  - Loading other user info
   *  - Loading existing messages
   */
  private async handleConversationSetup(conversationId: string): Promise<void> {
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

      this.loadMessagesForConversation(conversationId);
      this.chatIsChannel = false;
      console.log('Conversation setup complete. Other user:', this.otherUser);
    } catch (error) {
      console.error('Error during conversation setup:', error);
    }
  }

  /**Message Loading Functions */

  /** Loads enriched messages for a conversation using the service */
  private loadMessagesForConversation(conversationId: string): void {
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

  /** Loads enriched messages for a channel using the service */
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

  /**User Info Function */

  /** Fetches and stores profile info for the conversation partner */
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

  /**Channel Resolution Functions */

  /** Attempts to resolve channel from cached channels or Firestore */
  private async resolveChannelById(channelId: string): Promise<any | null> {
    const knownChannels = this.channelService.getChannels();
    const matchedChannel = knownChannels.find((c) => c.channelId === channelId);

    if (matchedChannel) {
      return matchedChannel;
    }

    return await this.channelService.getChannelById(channelId);
  }

  /** Sets the currently active channel and loads its messages */
  private setActiveChannel(channel: any): void {
    this.selectedChannel = channel;
    this.channelService.setSelectedChannel(channel);
    this.loadMessagesForChannel(channel);
  }

  /**All Message Sending and Editing Functions*/

  /** Handles sending of messages:
   *  - New messages
   *  - Edited messages
   *  - Thread replies
   */
  async sendMessage(): Promise<void> {
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
    } catch (error) {}
  }

  /** Updates a message in a thread */
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

  /** Sends a new message in a thread (channel or conversation) */
  private async sendThreadMessage(
    channelId: string,
    messageText: string,
    userId: string
  ): Promise<void> {
    if (this.chatIsConversation) {
      await this.channelService.sendConversationThreadMessage(
        channelId,
        this.activeThreadMessageId,
        messageText,
        userId
      );
    } else {
      await this.channelService.sendThreadMessage(
        channelId,
        this.activeThreadMessageId,
        messageText,
        userId
      );
    }

    this.loadThreadMessages();
  }

  /** Updates an existing message (non-thread) */
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

    this.editedMessage = null;
  }

  /** Creates a new message in the appropriate Firestore collection */
  private async createNewMessage(
    channelId: string,
    messageText: string,
    userId: string
  ): Promise<void> {
    if (this.chatIsConversation) {
      this.messageCollection = collection(
        this.firestore,
        `conversations/${channelId}/directMessages`
      );
    } else {
      this.messageCollection = collection(
        this.firestore,
        `channels/${channelId}/messages`
      );
    }
    await this.sendMessageInConversation(messageText, userId, channelId);
  }

  /** Writes the message data to Firestore */
  async sendMessageInConversation(
    messageText: string,
    userId: string,
    channelId: string
  ) {
    const newMessage = {
      text: messageText,
      timestamp: serverTimestamp(),
      senderID: userId,
      channelId: channelId,
    };
    await addDoc(this.messageCollection, newMessage);
    console.log('Message sent successfully:', newMessage);
  }

  /** Clears input and resets editing state after a message is sent */
  private afterMessageSend(): void {
    this.chatMessage = '';
  }

  /** Puts a message into edit mode */
  startEditingMessage(message: any): void {
    this.chatMessage = message.text;
    this.editedMessage = message;
  }

  /** All Thread Handlin Functions */

  /** Opens a thread view for a specific message */
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

  /** Loads messages in the currently active thread */
  loadThreadMessages(): void {
    const channelId = this.selectedChannel?.channelId;
    const messageId = this.activeThreadMessageId;

    if (!messageId) return;

    if (this.chatIsConversation && channelId) {
      this.channelService
        .getEnrichedConversationThreadMessages(channelId, messageId)
        .subscribe((messages) => {
          this.threadMessages$ = of(messages);
        });

      const docRef = doc(
        this.firestore,
        `conversations/${channelId}/directMessages/${messageId}`
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
    } else if (channelId) {
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
  }

  /** Sets the active thread message and fetches its data */
  async setActiveThreadMessage(messageId: string) {
    this.activeThreadMessageId = messageId;

    if (!this.selectedChannel?.channelId) {
      this.activeThreadMessage = null;
      return;
    }

    let docRef;

    if (this.chatIsConversation) {
      docRef = doc(
        this.firestore,
        `conversations/${this.selectedChannel.channelId}/directMessages/${messageId}`
      );
    } else {
      docRef = doc(
        this.firestore,
        `channels/${this.selectedChannel.channelId}/messages/${messageId}`
      );
    }

    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      this.activeThreadMessage = { id: docSnap.id, ...docSnap.data() };
    } else {
      this.activeThreadMessage = null;
    }
  }

  /** Closes thread view and returns to channel view */
  closeThreadView(): void {
    this.chatIsThread = false;
    if (!this.chatIsConversation) {
      this.chatIsChannel = true;
    }
    const channelId = this.selectedChannel?.channelId;
    if (channelId) {
      this.router.navigate([`/chat/${channelId}`]);
    }
  }

  /** All Navigation & Dialog Functions */

  /** Navigates back to the main page */
  navigateToMain(): void {
    this.router.navigate(['/main']);
  }

  /** Opens the bottom menu dialog */
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
  /** Opens the member list dialog for the current channel */
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

  /** Opens a profile dialog for the conversation partner */
  openProfileDialogOtherUser(): void {
    this.dialog.open(ProfilDialogComponent, {
      maxWidth: '90vw',
      panelClass: 'bottom-dialog-panel',
      data: {
        user: this.otherUser,
        loggedUser: this.currentUser?.id,
        isUser: false,
      },
    });
  }

  /** Opens the channel info panel */
  openChannelInfo(): void {
    this.isChannelInfoOpen = true;
  }

  /** All Mention (@/#) Functions */

  /** Checks key input for @ or # triggers and handles UI accordingly */
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

  /** Fetches list of users that can be mentioned */
  private async fetchMentionableUsers(): Promise<void> {
    if (!this.selectedChannel?.channelId) return;

    try {
      this.mentionableUsers = await this.mentionService.fetchMentionableUsers(
        this.selectedChannel.channelId
      );
    } catch (error) {
      console.error('Error fetching mentionable users:', error);
    }
  }

  /** Fetches all channels for #hashtag reference */
  private async fetchAllChannels(): Promise<void> {
    try {
      this.allChannels = await this.mentionService.fetchAllChannels();
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  }

  /** Filters user list for @ mentions */
  private filterMentionableUsers(term: string): void {
    this.filteredMentionableUsers = this.mentionService.filterUsers(
      this.mentionableUsers,
      term
    );
  }

  /** Filters channel list for # hashtags */
  private filterChannels(term: string): void {
    this.filteredChannels = this.mentionService.filterChannels(
      this.allChannels,
      term
    );
  }

  /** Selects a user for mention and inserts their name into the text */
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

  /** Selects a channel for hashtag and inserts it into the text */
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

  /** Determines what term (if any) the user is currently typing after @ or # */
  private getCurrentTriggerTerm(triggerChar: '@' | '#'): string | null {
    const textarea = this.chatField?.nativeElement;
    if (!textarea) return null;

    const cursorPos = textarea.selectionStart;

    return this.mentionService.getCurrentTriggerTerm(
      this.chatMessage,
      cursorPos,
      triggerChar
    );
  }

  /** Triggers mention popup manually (button or keyboard) */
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

  /** Inserts '@' at current cursor position and shows popup */
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

  /** Removes '@' symbol and closes popup */
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

  /** Handles @ mention UI trigger */
  private async handleMentionTrigger(): Promise<void> {
    this.mentionPopupVisible = true;
    await this.fetchMentionableUsers();
  }

  /** Handles # hashtag UI trigger */
  private handleHashtagTrigger(): void {
    this.hashtagPopupVisible = true;
  }

  /** Closes all active mention/hashtag popups */
  private closeAllPopups(): void {
    this.mentionPopupVisible = false;
    this.hashtagPopupVisible = false;
  }
  /** Hides popups if user deleted all triggers */
  private cleanupMentionAndHashtag(): void {
    if (!this.chatMessage.includes('@')) {
      this.mentionPopupVisible = false;
    }
    if (!this.chatMessage.includes('#')) {
      this.hashtagPopupVisible = false;
    }
  }

  /** Filters popup lists after user types */
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

  /** All DOM Utilities */

  /** Scrolls chat container to the bottom */
  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.chatBodyRef) {
        const container = this.chatBodyRef.nativeElement;
        container.scrollTop = container.scrollHeight;
      }
    }, 0);
  }

  /** Focuses the message input field */
  focusChatInput(): void {
    if (this.chatField) {
      this.chatField.nativeElement.focus();
    }
  }

  /** All Emoji Picker related functions */

  /** Toggles emoji picker and calculates its position */
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

  /** Inserts selected emoji into current cursor position */
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

  /** Handles manual closing of emoji picker */
  onPickerClosed() {
    this.emojiPickerVisible = false;
  }

  /** Hides emoji picker when clicking outside */
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
}
