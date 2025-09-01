import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, from, of, Observable } from 'rxjs';
import {
  Firestore, getDoc, collectionData, collection, doc, setDoc, query, where, getDocs, writeBatch, Timestamp, orderBy, limit, serverTimestamp, addDoc, CollectionReference, QueryConstraint, DocumentData,
  QuerySnapshot,
} from '@angular/fire/firestore';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Channel } from '../../interfaces/channel.interface';
import { appUser } from '../../interfaces/user.interface';
import { Reactions } from '../../interfaces/reactions.interface';

export interface DirectMessage {
  id?: string;
  name: string;
  img: string;
  status: string;
}

export interface DirectMessageRaw {
  id?: string;
  text: string;
  senderID: string;
  timestamp: any;
}

export interface EnrichedMessage {
  id: string;
  text: string;
  timestamp: any;
  senderID: string;
  formattedTime: string;
  username: string;
  avatar: string;
  reactions?: any[];
  answersCount?: number;
  lastAnswerTime?: string | null;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root',
})
export class ChannelsDirectMessageService {
  constructor(private firestore: Firestore) { }

  // --- Static Data (could be loaded dynamically from Firestore instead) ---
  private channelsForGast: string[] = ['Entwicklerteam', 'Office-Team'];
  directMessagesForGast: DirectMessage[] = [
    { id: 'Guest', name: 'Frederik Beck', img: '3.png', status: 'online' },
    { id: 'Sofia Müller', name: 'Sofia Müller', img: '5.png', status: 'online' },
    { id: 'Noah Braun', name: 'Noah Braun', img: '6.png', status: 'online' },
    { id: 'Elise Roth', name: 'Elise Roth', img: '1.png', status: 'offline' },
    { id: 'Elias Neumann', name: 'Elias Neumann', img: '2.png', status: 'online' },
    { id: 'Steffen Hoffmann', name: 'Steffen Hoffmann', img: '4.png', status: 'online' },
  ];
  channels: Channel[] = [
    { channelId: 'T4GIOzIalU8W0In7whdV', name: 'Entwicklerteam', createdBy: 'Sofia Müller', members: ['Sofia Müller', 'Noah Braun', 'Guest'], description: 'Channel des Entwicklerteams' }
  ];

  // --- State Management using BehaviorSubjects ---
  private selectedChannelSource = new BehaviorSubject<Channel | null>(null);
  selectedChannel$ = this.selectedChannelSource.asObservable();

  private selectedDirectMessageSource = new BehaviorSubject<appUser | null>(null);
  selectedDirectMessage$ = this.selectedDirectMessageSource.asObservable();

  // --- Public API for Channels and Direct Messages ---
  getChannels(): Channel[] { return this.channels; }
  setSelectedChannel(channel: Channel): void { this.selectedChannelSource.next(channel); }
  getSelectedChannel(): Channel | null { return this.selectedChannelSource.value; }
  getChannelsForGast(): string[] { return this.channelsForGast; }
  getDirectMessagesForGast(): DirectMessage[] { return this.directMessagesForGast; }
  setSelectedDirectMessage(user: appUser): void { this.selectedDirectMessageSource.next(user); }

  // --- Firestore Collection References (helpers for paths) ---
    // Returns messages collection reference for a given channel
  private getChannelMessagesCollection(channelId: string): CollectionReference {
    return collection(this.firestore, `channels/${channelId}/messages`);
  }

  
  // Returns thread messages collection reference for a given message in a channel
  getChannelThreadMessagesCollection(channelId: string, messageId: string): CollectionReference {
    return collection(this.firestore, `channels/${channelId}/messages/${messageId}/threadMessages`);
  }

    // Returns messages collection reference for a conversation
  private getConversationMessagesCollection(conversationId: string): CollectionReference {
    return collection(this.firestore, `conversations/${conversationId}/directMessages`);
  }

  // Returns thread messages collection reference for a conversation message
  private getConversationThreadMessagesCollection(conversationId: string, parentMessageId: string): CollectionReference {
    return collection(this.firestore, `conversations/${conversationId}/directMessages/${parentMessageId}/threadMessages`);
  }

  // --- Generic Firestore Data Fetcher with Optional Query Constraints ---
  getData<T>(collectionRef: CollectionReference, options?: { idField?: string, queryConstraints?: QueryConstraint[] }): Observable<T[]> {
    let q = query(collectionRef);
    if (options?.queryConstraints) {
      q = query(collectionRef, ...options.queryConstraints);
    }
    return collectionData(q, { idField: options?.idField || 'id' }).pipe(
      map((docs: DocumentData[]) => docs.map(doc => doc as T)), 
      catchError((error) => {
        return of([]);
      })
    );
  }

  // --- Fetch User Details from Firestore ---
  private getUserDetails(senderID: string): Observable<any> {
    if (!senderID) return of(null);
    const userDocRef = doc(this.firestore, 'users', senderID);
    return from(getDoc(userDocRef)).pipe(
      map((docSnapshot) => (docSnapshot.exists() ? docSnapshot.data() : null)),
      catchError((error) => {
        return of(null);
      })
    );
  }

  // --- Get display name for reaction users ---
  fetchReactorName(reactorID: string | undefined): Promise<string> {
    if (!reactorID || typeof reactorID !== 'string' || reactorID.trim() === '') {
      return Promise.resolve('Unknown User');
    }
    const userDocRef = doc(this.firestore, 'users', reactorID);
    return getDoc(userDocRef)
      .then((docSnap) => (docSnap.exists() ? docSnap.data()?.['userName'] || 'Unknown User' : 'Unknown User'))
      .catch((error) => {
        return 'Unknown User';
      });
  }

  // --- Timestamp formatting (used for enriched messages) ---
  private formatTimestamp(timestamp: any): string {
    if (timestamp && timestamp.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return '';
  }

  // --- Basic Fetch Methods for Messages ---
  getMessages(channelId: string): Observable<any[]> {
    return this.getData(this.getChannelMessagesCollection(channelId));
  }

    // --- Fetch messages for a conversation ---
  getConversationMessages(conversationId: string): Observable<any[]> {
    return this.getData(this.getConversationMessagesCollection(conversationId), {
      queryConstraints: [orderBy('timestamp', 'asc')]
    });
  }

    // --- Fetch thread messages for a channel message ---
  getThreadMessages(channelId: string, threadMessageId: string): Observable<any[]> {
    return this.getData(this.getChannelThreadMessagesCollection(channelId, threadMessageId));
  }

    // --- Fetch thread messages for a conversation message ---
  getConversationThreadMessages(conversationId: string, parentMessageId: string): Observable<any[]> {
    return this.getData(this.getConversationThreadMessagesCollection(conversationId, parentMessageId));
  }

  // --- Utility: Thread Message Counts and Latest ---
  getThreadMessageCount(channelId: string, parentMessageId: string): Observable<number> {
    return this.getData(this.getChannelThreadMessagesCollection(channelId, parentMessageId)).pipe(
      map((messages) => messages.length),
      catchError(() => of(0))
    );
  }

    // --- Get thread message count for a channel message ---
  getLatestThreadMessage(channelId: string, messageId: string): Observable<any> {
    return this.getData(this.getChannelThreadMessagesCollection(channelId, messageId), {
      queryConstraints: [orderBy('timestamp', 'desc'), limit(1)]
    }).pipe(
      map((messages) => (messages.length > 0 ? messages[0] : null))
    );
  }

// --- Centralized Enrichment (adds username, avatar, reactions, etc.) ---
enrichMessage(contextId: string, message: any): Observable<EnrichedMessage> {
  return combineLatest([
    this.getUserInfo$(message.senderID),
    this.getReactions$(contextId, message.id),
    this.getThreadInfo$(contextId, message),
  ]).pipe(
    map(([userDetails, reactions, { answersCount, lastAnswer }]) => ({
      ...message,
      formattedTime: this.formatTimestamp(message.timestamp),
      username: userDetails?.userName || 'Unknown User',
      avatar: userDetails?.profilePic || '1',
      reactions: reactions,
      answersCount,
      lastAnswerTime: lastAnswer ? this.formatTimestamp(lastAnswer.timestamp) : null,
    }))
  );
}

/** --- Helpers --- */
private getUserInfo$(senderID: string): Observable<any> {
  return senderID
    ? this.getUserDetails(senderID).pipe(catchError(() => of(null)))
    : of(null);
}

private getReactions$(contextId: string, messageId: string): Observable<any[]> {
  return this.getReactionsForMessage(contextId, messageId).pipe(
    catchError(() => of([]))
  );
}

private getThreadInfo$(contextId: string, message: any): Observable<{ answersCount: number; lastAnswer: any }> {
  const isChannelMainMessage = message.id && !message.parentMessageId && contextId.length > 10;

  if (!isChannelMainMessage) {
    return of({ answersCount: 0, lastAnswer: null });
  }

  return combineLatest([
    this.getThreadMessageCount(contextId, message.id),
    this.getLatestThreadMessage(contextId, message.id),
  ]).pipe(
    map(([answersCount, lastAnswer]) => ({ answersCount, lastAnswer }))
  );
}

  // --- Streams of Enriched Messages (sorted by timestamp) ---
  getEnrichedMessages(channelId: string): Observable<EnrichedMessage[]> {
    return this.getMessages(channelId).pipe(
      switchMap((messages) => {
        if (!messages.length) return of([]);
        const enrichedMessages$ = messages.map((message) => this.enrichMessage(channelId, message));
        return combineLatest(enrichedMessages$).pipe(
          map((enrichedMessages) =>
            enrichedMessages.sort((a, b) => (a.timestamp?.seconds ?? 0) - (b.timestamp?.seconds ?? 0))
          )
        );
      })
    );
  }

  getEnrichedThreadMessages(channelId: string, parentMessageId: string): Observable<EnrichedMessage[]> {
    return this.getThreadMessages(channelId, parentMessageId).pipe(
      switchMap((messages) => {
        if (!messages.length) return of([]);
        const enrichedMessages$ = messages.map((message) => this.enrichMessage(channelId, message));
        return combineLatest(enrichedMessages$).pipe(
          map((enrichedMessages) =>
            enrichedMessages.sort((a, b) => (a.timestamp?.seconds ?? 0) - (b.timestamp?.seconds ?? 0))
          )
        );
      })
    );
  }

  getEnrichedConversationMessages(conversationId: string): Observable<EnrichedMessage[]> {
    return this.getConversationMessages(conversationId).pipe(
      switchMap((messages) => {
        if (!messages.length) return of([]);
        const enrichedMessages$ = messages.map((message) => this.enrichMessage(conversationId, message));
        return combineLatest(enrichedMessages$).pipe(
          map((enrichedMessages) =>
            enrichedMessages.sort((a, b) => (a.timestamp?.seconds ?? 0) - (b.timestamp?.seconds ?? 0))
          )
        );
      })
    );
  }

  getEnrichedConversationThreadMessages(conversationId: string, parentMessageId: string): Observable<EnrichedMessage[]> {
    return this.getConversationThreadMessages(conversationId, parentMessageId).pipe(
      switchMap((messages) => {
        if (!messages.length) return of([]);
        const enrichedMessages$ = messages.map((message) => this.enrichMessage(conversationId, message));
        return combineLatest(enrichedMessages$).pipe(
          map((enrichedMessages) =>
            enrichedMessages.sort((a, b) => (a.timestamp?.seconds ?? 0) - (b.timestamp?.seconds ?? 0))
          )
        );
      })
    );
  }

  // --- Reaction Handling ---
// Determines whether the given ID corresponds to a channel, a conversation, or neither.
// Returns a string literal 'channel', 'conversation', or 'unknown'.
private async getContextType(id: string): Promise<'channel' | 'conversation' | 'unknown'> {
  const channelDocRef = doc(this.firestore, `channels/${id}`);
  const channelDocSnap = await getDoc(channelDocRef);
  if (channelDocSnap.exists()) return 'channel';

  const conversationDocRef = doc(this.firestore, `conversations/${id}`);
  const conversationDocSnap = await getDoc(conversationDocRef);
  if (conversationDocSnap.exists()) return 'conversation';

  return 'unknown';
}

// Fetches the reactions for a specific message, automatically detecting if it belongs
// to a channel or a conversation. Returns an Observable of Reactions array.
// Uses getContextType to determine the correct Firestore path.
getReactionsForMessage(contextId: string, messageId: string): Observable<Reactions[]> {
  return from(this.getContextType(contextId)).pipe(
    switchMap((contextType) => {
      let reactionsCollection: CollectionReference;

      if (contextType === 'channel') {
        reactionsCollection = collection(this.firestore, `channels/${contextId}/messages/${messageId}/reactions`);
      } else if (contextType === 'conversation') {
        reactionsCollection = collection(this.firestore, `conversations/${contextId}/directMessages/${messageId}/reactions`);
      } else {
        return of([]); 
      }
      return this.getData<Reactions>(reactionsCollection);
    })
  );
}

// Toggles a reaction (add/remove) for a message in either a channel or a conversation.
// Determines the correct Firestore collection for the message before updating.
// Skips action if reactorID is missing or collection cannot be determined.
async toggleReaction(
  contextId: string,
  messageId: string,
  reactionType: string,
  reactorID: string
): Promise<void> {
  if (!reactorID) return;

  const reactionsCollection = await this.getReactionsCollection(contextId, messageId);
  if (!reactionsCollection) return;

  await this.toggleReactionInCollection(reactionsCollection, reactionType, reactorID);
}

// Helper function to get the Firestore collection reference for reactions of a message.
// Uses getContextType to decide whether the context is a channel or conversation.
// Returns null if the context type cannot be determined.
private async getReactionsCollection(contextId: string, messageId: string): Promise<CollectionReference | null> {
  const type = await this.getContextType(contextId);

  switch (type) {
    case 'channel':
      return collection(this.firestore, `channels/${contextId}/messages/${messageId}/reactions`);
    case 'conversation':
      return collection(this.firestore, `conversations/${contextId}/directMessages/${messageId}/reactions`);
    default:
      return null;
  }
}

  // Helper for adding/removing a reaction atomically
private async toggleReactionInCollection(
  reactionsCollection: CollectionReference,
  reactionType: string,
  reactorID: string
): Promise<void> {
  const existing = await getDocs(
    query(
      reactionsCollection,
      where('type', '==', reactionType),
      where('reactorID', '==', reactorID)
    )
  );
  if (!existing.empty) return this.removeReactions(existing);
  await setDoc(doc(reactionsCollection), {
    reactorID,
    type: reactionType,
    timestamp: Timestamp.now(),
  } as Reactions);
}

private async removeReactions(existing: QuerySnapshot): Promise<void> {
  const batch = writeBatch(this.firestore);
  existing.forEach((docSnap) => batch.delete(docSnap.ref));
  await batch.commit();
}

  // --- Sending Messages ---
  async sendThreadMessage(
    channelId: string,
    threadMessageId: string,
    text: string,
    senderID: string
  ): Promise<void> {
    const threadMessagesCollection = this.getChannelThreadMessagesCollection(channelId, threadMessageId);
    await setDoc(doc(threadMessagesCollection), {
      text,
      senderID,
      timestamp: Timestamp.now(),
    });
  }

  sendConversationThreadMessage(
    conversationId: string,
    parentMessageId: string,
    messageText: string,
    userId: string
  ): Promise<void> {
    const threadCollection = this.getConversationThreadMessagesCollection(conversationId, parentMessageId);
    const newMessage = {
      text: messageText,
      timestamp: serverTimestamp(),
      senderID: userId,
      channelId: conversationId,
    };
    return addDoc(threadCollection, newMessage).then(() =>
      console.log()
    );
  }

  // --- Channels ---
  async getChannelById(channelId: string): Promise<any> {
    const channelRef = doc(this.firestore, `channels/${channelId}`);
    const snap = await getDoc(channelRef);
    return snap.exists() ? { channelId, ...snap.data() } : null;
  }

  // --- Guest Selections (separate from normal users) ---
  private selectedGuestDirectMessageSource = new BehaviorSubject<DirectMessage | null>(null);
  selectedGuestDirectMessage$ = this.selectedGuestDirectMessageSource.asObservable();
  setSelectedDirectMessageGast(user: DirectMessage): void {
    this.selectedGuestDirectMessageSource.next(user);
  }

  private selectedGuestChannelSource = new BehaviorSubject<Channel | null>(null);
  selectedGuestChannel$ = this.selectedGuestChannelSource.asObservable();
  setSelectedGuestChannel(channel: Channel) {
    this.selectedGuestChannelSource.next(channel);
  }
}
