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
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { ChannelsDirectMessageService } from './channels-direct-message.service';
import { appUser } from '../../interfaces/user.interface';
import { SessionService } from './currentUserSession.service';
interface ChatMessage {
  id: string;
  text: string;
  senderID: string;
  timestamp: any;
  pending?: boolean; // 👈 marks optimistic
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private firestore = inject(Firestore);
  private channelService = inject(ChannelsDirectMessageService);

  // State Subjects
  private _selectedChannel = new BehaviorSubject<any>(null);
  selectedChannel$ = this._selectedChannel.asObservable();

  private _otherUser = new BehaviorSubject<appUser | null>(null);
  otherUser$ = this._otherUser.asObservable();

  private _messages = new BehaviorSubject<any[]>([]);
  messages$ = this._messages.asObservable();

  private _threadMessages = new BehaviorSubject<any[] | null>(null);
  threadMessages$ = this._threadMessages.asObservable();

  private _activeThreadMessage = new BehaviorSubject<any | null>(null);
  activeThreadMessage$ = this._activeThreadMessage.asObservable();

  private _isThread = new BehaviorSubject<boolean>(false);
  isThread$ = this._isThread.asObservable();

  // Chat context flags
  isConversation: boolean = false;
  isThread: boolean = false;
  isChannel: boolean = false;
  activeThreadMessageId: string = '';

  constructor(private userSession: SessionService) {}

  /**
   * Initializes the chat based on the provided ID (channel or conversation).
   */
  async initializeChat(
    id: string,
    currentUserId: string | undefined
  ): Promise<void> {
    if (!id) return;

    try {
      const channelDocRef = doc(this.firestore, `channels/${id}`);
      const channelSnap = await getDoc(channelDocRef);

      if (channelSnap.exists()) {
        const channel = await this.resolveChannelById(id);
        if (channel) {
          this.isConversation = false;
          this.isThread = false;
          this._selectedChannel.next(channel);
          this.loadMessagesForChannel(channel);
        }
        return;
      }

      const convDocRef = doc(this.firestore, `conversations/${id}`);
      const convSnap = await getDoc(convDocRef);

      if (convSnap.exists()) {
        this.isConversation = true;
        this.isThread = false;
        this._selectedChannel.next({ channelId: id });
        await this.handleConversationSetup(id, currentUserId);
        return;
      }

      console.warn('Neither channel nor conversation found for ID:', id);
    } catch (error) {
      console.error('Error resolving channel/conversation:', error);
    }
  }

  /**
   * Sets up conversation by resolving participants, loading other user info, and messages.
   */
  private async handleConversationSetup(
    conversationId: string,
    currentUserId: string | undefined
  ): Promise<void> {
    try {
      const convDocRef = doc(this.firestore, `conversations/${conversationId}`);
      const convSnap = await getDoc(convDocRef);

      if (!convSnap.exists()) {
        console.warn('Conversation not found:', conversationId);
        return;
      }

      const data = convSnap.data();
      const participants: string[] = data?.['participants'] || [];

      if (!currentUserId) {
        console.warn('Current user not available');
        return;
      }

      let otherUserId: string;
      const uniqueParticipants = Array.from(new Set(participants));
      if (
        uniqueParticipants.length === 1 &&
        uniqueParticipants[0] === currentUserId
      ) {
        otherUserId = currentUserId;
      } else {
        otherUserId = participants.find((id) => id !== currentUserId)!;
      }

      await this.fetchOtherUserInfo(otherUserId);
      this.loadMessagesForConversation(conversationId);
    } catch (error) {
      console.error('Error during conversation setup:', error);
    }
  }

  /**
   * Loads enriched messages for a conversation.
   */
  private loadMessagesForConversation(conversationId: string): void {
    this.channelService
      .getEnrichedConversationMessages(conversationId)
      .subscribe({
        next: (messages) => this._messages.next(messages),
        error: (error) =>
          console.error('Error loading enriched conversation messages:', error),
      });
  }

  /**
   * Loads enriched messages for a channel.
   */
  private loadMessagesForChannel(channel: any): void {
    if (!channel?.channelId) return;

    this.channelService.getEnrichedMessages(channel.channelId).subscribe({
      next: (messages) => {
        const current = this._messages.getValue();
        // Filter out optimistic ones whose real version has arrived
        const filtered = current.filter((m) => m.pending);
        this._messages.next([...filtered, ...messages]);
      },
      error: (err) => console.error('Error loading channel messages:', err),
    });
  }

  /**
   * Fetches and stores profile info for the conversation partner.
   */
  private async fetchOtherUserInfo(userId: string): Promise<void> {
    try {
      const userDocRef = doc(this.firestore, `users/${userId}`);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        console.warn(`User document not found for ID: ${userId}`);
        this._otherUser.next(null);
        return;
      }

      const data = userSnap.data();
      this._otherUser.next({
        id: userId,
        userName: data?.['userName'] || 'Unknown',
        profilePic: data?.['profilePic'],
        status: data?.['status'] ?? false,
        email: data?.['email'] || '',
      });
    } catch (error) {
      console.error('Error fetching other user info:', error);
      this._otherUser.next(null);
    }
  }

  /**
   * Attempts to resolve channel from cached channels or Firestore.
   */
  private async resolveChannelById(channelId: string): Promise<any | null> {
    const knownChannels = this.channelService.getChannels();
    const matchedChannel = knownChannels.find((c) => c.channelId === channelId);
    if (matchedChannel) {
      return matchedChannel;
    }
    return await this.channelService.getChannelById(channelId);
  }

  /**
   * Handles sending of messages (new, edited, thread replies).
   */
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
      if (context.editedMessage) {
        if (context.isThread) {
          await this.updateThreadMessage(
            channelId,
            messageText,
            context.editedMessage,
            context.activeThreadMessageId
          );
        } else {
          await this.updateExistingMessage(
            channelId,
            messageText,
            context.editedMessage,
            context.isConversation
          );
        }
      } else if (context.isThread && context.activeThreadMessageId) {
        await this.sendThreadMessage(
          channelId,
          messageText,
          userId,
          context.activeThreadMessageId,
          context.isConversation
        );
      } else {
        await this.createNewMessage(
          channelId,
          messageText,
          userId,
          context.isConversation
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
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
    if (isConversation) {
      await this.channelService.sendConversationThreadMessage(
        channelId,
        activeThreadMessageId,
        messageText,
        userId
      );
    } else {
      await this.channelService.sendThreadMessage(
        channelId,
        activeThreadMessageId,
        messageText,
        userId
      );
    }
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

    let messageRef;
    if (isConversation) {
      messageRef = doc(
        this.firestore,
        `conversations/${channelId}/directMessages/${editedMessage.id}`
      );
    } else {
      messageRef = doc(
        this.firestore,
        `channels/${channelId}/messages/${editedMessage.id}`
      );
    }
    await updateDoc(messageRef, { text: messageText });
  }

  /** Creates a new message in the appropriate Firestore collection */
  private async createNewMessage(
    channelId: string,
    messageText: string,
    userId: string,
    isConversation: boolean
  ): Promise<void> {
    const tempId = `temp-${Date.now()}`;

    const currentUser = this.userSession.getCurrentUser();

    const optimisticMessage: any = {
      id: tempId,
      text: messageText,
      senderID: currentUser?.id || userId,
      timestamp: new Date(),
      pending: true,
      userName: currentUser?.userName,
      profilePic: currentUser?.profilePic,
      email: currentUser?.email,
      status: true, // assume online
    };

    // Push to BehaviorSubject immediately
    this._messages.next([...this._messages.getValue(), optimisticMessage]);

    // Firestore write
    let messageCollectionRef;
    if (isConversation) {
      messageCollectionRef = collection(
        this.firestore,
        `conversations/${channelId}/directMessages`
      );
    } else {
      messageCollectionRef = collection(
        this.firestore,
        `channels/${channelId}/messages`
      );
    }

    const newMessage = {
      text: messageText,
      timestamp: serverTimestamp(),
      senderID: userId,
      channelId,
    };

    const docRef = await addDoc(messageCollectionRef, newMessage);

    // Once Firestore assigns a real ID, optimistic will be overwritten
    console.log('Message sent, awaiting enrichment:', docRef.id);
  }

  /** Opens a thread view for a specific message */
  /** Opens a thread view for a specific message */
  async openThread(
    messageId: string,
    forceThreadToggle: boolean = true
  ): Promise<void> {
    if (forceThreadToggle) {
      this._isThread.next(true);
    }

    this.activeThreadMessageId = messageId;
    const channelId = this._selectedChannel.getValue()?.channelId;
    if (!channelId) return;

    // Ensure parent message is loaded first
    await this.setActiveThreadMessage(channelId, messageId);

    // Load thread messages (replies)
    this.loadThreadMessages(channelId, messageId);
  }

  /** Loads messages in the currently active thread */
  loadThreadMessages(channelId: string, messageId: string): void {
    if (!messageId) return;
    console.log('loading messages');
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
          console.log(messages);
        });
    }
    console.log(this._threadMessages);
  }

  /** Sets the active thread message and fetches its data */
  async setActiveThreadMessage(channelId: string, messageId: string) {
    let docRef;
    if (this.isConversation) {
      docRef = doc(
        this.firestore,
        `conversations/${channelId}/directMessages/${messageId}`
      );
    } else {
      docRef = doc(
        this.firestore,
        `channels/${channelId}/messages/${messageId}`
      );
    }

    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const rawMsg = { id: docSnap.id, ...docSnap.data() };
      this.channelService
        .enrichMessage(channelId, rawMsg)
        .subscribe((enrichedMsg) => {
          this._activeThreadMessage.next(enrichedMsg);
        });
    } else {
      this._activeThreadMessage.next(null);
    }
  }

  /** Closes thread view and returns to channel view */
  closeThread(): void {
    this._isThread.next(false);
    this.activeThreadMessageId = '';
    this._threadMessages.next(null);
    this._activeThreadMessage.next(null);
    console.log(this.isThread);
  }
}
