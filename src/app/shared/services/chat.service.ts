import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
import { ChannelsDirectMessageService } from './channels-direct-message.service';
import { appUser } from '../../interfaces/user.interface';
import { SessionService } from './currentUserSession.service';
import { ChatLoadingService } from './chat-loading.service';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  firestore = inject(Firestore);
  channelService = inject(ChannelsDirectMessageService);
  chatLoading = inject(ChatLoadingService);
  // ------------------- State Subjects -------------------
  // Currently selected channel or conversation
  private _selectedChannel = new BehaviorSubject<any>(null);
  selectedChannel$ = this._selectedChannel.asObservable();

  // Info about the other participant in a conversation
  _otherUser = new BehaviorSubject<appUser | null>(null);
  otherUser$ = this._otherUser.asObservable();

  // List of all messages in the current chat (channel or conversation)
  _messages = new BehaviorSubject<any[]>([]);
  messages$ = this._messages.asObservable();

  // Messages specific to an active thread
  private _threadMessages = new BehaviorSubject<any[] | null>(null);
  threadMessages$ = this._threadMessages.asObservable();

  // The currently active message in a thread
  private _activeThreadMessage = new BehaviorSubject<any | null>(null);
  activeThreadMessage$ = this._activeThreadMessage.asObservable();

  // Flag indicating whether the UI is currently displaying a thread
  private _isThread = new BehaviorSubject<boolean>(false);
  isThread$ = this._isThread.asObservable();

  // ------------------- Chat context flags -------------------
  isConversation: boolean = false; // True if viewing a conversation
  isThread: boolean = false; // True if viewing a thread
  isChannel: boolean = false; // True if viewing a channel
  activeThreadMessageId: string = ''; // Tracks the current active thread message

  constructor(private userSession: SessionService) {}

  // ------------------- Initialization -------------------
  /**
   * Initializes the chat by checking Firestore for a channel or conversation
   * and loading the appropriate messages and metadata.
   */
  async initializeChat(
    id: string,
    currentUserId: string | undefined
  ): Promise<void> {
    if (!id) return;

    try {
      const channelSnap = await this.getDocIfExists(`channels/${id}`);
      if (channelSnap) return this.loadChannel(id);

      const convSnap = await this.getDocIfExists(`conversations/${id}`);
      if (convSnap) await this.loadConversation(id, currentUserId);
    } catch {}
  }

  /**
   * Fetches a Firestore document from a given path and returns it
   * only if it exists, otherwise returns null.
   */
  private async getDocIfExists(path: string) {
    const docSnap = await getDoc(doc(this.firestore, path));
    return docSnap.exists() ? docSnap : null;
  }

  /**
   * Loads a channel by its ID, sets chat context to channel mode,
   * updates selected channel state, and loads its messages.
   */
  private async loadChannel(channelId: string) {
    const channel = await this.chatLoading.resolveChannelById(channelId);
    if (!channel) return;
    this.isConversation = false;
    this.isThread = false;
    this._selectedChannel.next(channel);
    this.chatLoading.loadMessagesForChannel(channel, this._messages);
  }

  /**
   * Loads a conversation by its ID, sets chat context to conversation mode,
   * updates selected channel state, and triggers conversation setup
   * (fetching participants, other user info, and messages).
   */
  private async loadConversation(
    conversationId: string,
    currentUserId: string | undefined
  ) {
    this.isConversation = true;
    this.isThread = false;
    this._selectedChannel.next({ channelId: conversationId });
    await this.handleConversationSetup(conversationId, currentUserId);
  }

  /**
   * Handles conversation setup: fetches participants, determines the other user,
   * and loads conversation messages.
   */
  private async handleConversationSetup(
    conversationId: string,
    currentUserId: string | undefined
  ): Promise<void> {
    try {
      const participants = await this.getConversationParticipants(
        conversationId
      );
      if (!participants || !currentUserId) return;

      const otherUserId = this.getOtherParticipantId(
        participants,
        currentUserId
      );
      await this.chatLoading.fetchOtherUserInfo(otherUserId, this._otherUser);
      this.chatLoading.loadMessagesForConversation(conversationId, this._messages);
    } catch {}
  }

  /**
   * Fetches participants for a conversation from Firestore.
   */
  private async getConversationParticipants(
    conversationId: string
  ): Promise<string[] | null> {
    const convDocRef = doc(this.firestore, `conversations/${conversationId}`);
    const convSnap = await getDoc(convDocRef);
    if (!convSnap.exists()) return null;
    const data = convSnap.data();
    return data?.['participants'] || [];
  }

  /**
   * Determines the other participant in the conversation given the current user.
   */
  private getOtherParticipantId(
    participants: string[],
    currentUserId: string
  ): string {
    const uniqueParticipants = Array.from(new Set(participants));
    if (
      uniqueParticipants.length === 1 &&
      uniqueParticipants[0] === currentUserId
    ) {
      return currentUserId;
    }
    return participants.find((id) => id !== currentUserId)!;
  }

  // ------------------- Sending / Updating Messages -------------------
  /** Sends a message: routes to appropriate handler */
  async sendMessage(
    channelId: string,
    messageText: string,
    userId: string,
    context: {
      isConversation: boolean;
      isThread: boolean;
      activeThreadMessageId: string;
      editedMessage: any;
    }
  ): Promise<void> {
    try {
      if (context.editedMessage)
        await this.handleEditedMessage(channelId, messageText, context);
      else if (context.isThread && context.activeThreadMessageId)
        await this.handleThreadMessage(channelId, messageText, userId, context);
      else
        await this.handleNewMessage(
          channelId,
          messageText,
          userId,
          context.isConversation
        );
    } catch {}
  }

  /** Handles edited messages */
  private async handleEditedMessage(
    channelId: string,
    messageText: string,
    context: {
      isConversation: boolean;
      isThread: boolean;
      editedMessage: any;
      activeThreadMessageId: string;
    }
  ) {
    if (context.isThread)
      await this.updateThreadMessage(
        channelId,
        messageText,
        context.editedMessage,
        context.activeThreadMessageId
      );
    else
      await this.updateExistingMessage(
        channelId,
        messageText,
        context.editedMessage,
        context.isConversation
      );
  }

  /** Handles sending a new thread message */
  private async handleThreadMessage(
    channelId: string,
    messageText: string,
    userId: string,
    context: { isConversation: boolean; activeThreadMessageId: string }
  ) {
    await this.sendThreadMessage(
      channelId,
      messageText,
      userId,
      context.activeThreadMessageId,
      context.isConversation
    );
  }

  /** Handles creating a new top-level message */
  private async handleNewMessage(
    channelId: string,
    messageText: string,
    userId: string,
    isConversation: boolean
  ) {
    await this.createNewMessage(channelId, messageText, userId, isConversation);
  }

  /** Updates a message in a thread */
  private async updateThreadMessage(
    channelId: string,
    messageText: string,
    editedMessage: any,
    activeThreadMessageId: string
  ): Promise<void> {
    if (!editedMessage?.id || !activeThreadMessageId) return;

    const messageRef = doc(
      this.firestore,
      `channels/${channelId}/messages/${activeThreadMessageId}/threadMessages/${editedMessage.id}`
    );
    await updateDoc(messageRef, { text: messageText });
    this.loadThreadMessages(channelId, activeThreadMessageId); // Reload thread messages
  }

  /** Sends a new message in a thread (channel or conversation) */
  private async sendThreadMessage(
    channelId: string,
    messageText: string,
    userId: string,
    activeThreadMessageId: string,
    isConversation: boolean
  ): Promise<void> {
    const sendFn = isConversation
      ? this.channelService.sendConversationThreadMessage.bind(
          this.channelService
        )
      : this.channelService.sendThreadMessage.bind(this.channelService);

    await sendFn(channelId, activeThreadMessageId, messageText, userId);
    this.loadThreadMessages(channelId, activeThreadMessageId);
  }

  /** Updates an existing message (non-thread) */
  private async updateExistingMessage(
    channelId: string,
    messageText: string,
    editedMessage: any,
    isConversation: boolean
  ): Promise<void> {
    if (!editedMessage?.id) return;

    const path = isConversation
      ? `conversations/${channelId}/directMessages/${editedMessage.id}`
      : `channels/${channelId}/messages/${editedMessage.id}`;

    const messageRef = doc(this.firestore, path);
    await updateDoc(messageRef, { text: messageText });
  }

  /** Adds a message locally with optimistic UI update */
  private addOptimisticMessage(messageText: string, userId: string) {
    const currentUser = this.userSession.getCurrentUser();
    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      id: tempId,
      text: messageText,
      senderID: currentUser?.id || userId,
      pending: true,
    };
    this._messages.next([...this._messages.getValue(), optimisticMessage]);
  }

  /** Persists a message to Firestore */
  private async persistMessage(
    channelId: string,
    messageText: string,
    userId: string,
    isConversation: boolean
  ) {
    const path = isConversation
      ? `conversations/${channelId}/directMessages`
      : `channels/${channelId}/messages`;

    await addDoc(collection(this.firestore, path), {
      text: messageText,
      timestamp: serverTimestamp(),
      senderID: userId,
      channelId,
    });
  }

  /** Public function that calls both */
  private async createNewMessage(
    channelId: string,
    messageText: string,
    userId: string,
    isConversation: boolean
  ) {
    this.addOptimisticMessage(messageText, userId);
    await this.persistMessage(channelId, messageText, userId, isConversation);
  }

  // ------------------- Threads -------------------
  /** Opens a thread for a specific message */
  async openThread(
    messageId: string,
    forceThreadToggle: boolean = true
  ): Promise<void> {
    if (forceThreadToggle) this._isThread.next(true);
    this.activeThreadMessageId = messageId;

    const channelId = this._selectedChannel.getValue()?.channelId;
    if (!channelId) return;

    await this.setActiveThreadMessage(channelId, messageId);
    this.loadThreadMessages(channelId, messageId);
  }

  /** Loads messages in the currently active thread */
  loadThreadMessages(channelId: string, messageId: string): void {
    if (!messageId) return;
    if (this.isConversation) {
      this.channelService
        .getEnrichedConversationThreadMessages(channelId, messageId)
        .subscribe((messages) => {
          this._threadMessages.next(messages);
        });
    } else {
      this.channelService
        .getEnrichedThreadMessages(channelId, messageId)
        .subscribe((messages) => {
          this._threadMessages.next(messages);
        });
    }
  }

  /** Returns Firestore doc reference for a message based on context */
  private getMessageDocRef(channelId: string, messageId: string) {
    const path = this.isConversation
      ? `conversations/${channelId}/directMessages/${messageId}`
      : `channels/${channelId}/messages/${messageId}`;
    return doc(this.firestore, path);
  }

  /** Sets the active thread message and fetches its data */
  async setActiveThreadMessage(channelId: string, messageId: string) {
    const docRef = this.getMessageDocRef(channelId, messageId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      this._activeThreadMessage.next(null);
      return;
    }

    const rawMsg = { id: docSnap.id, ...docSnap.data() };
    this.channelService
      .enrichMessage(channelId, rawMsg)
      .subscribe((enrichedMsg) => this._activeThreadMessage.next(enrichedMsg));
  }

  /** Closes the active thread and resets related state */
  closeThread(): void {
    this._isThread.next(false);
    this.activeThreadMessageId = '';
    this._threadMessages.next(null);
    this._activeThreadMessage.next(null);
  }
}
