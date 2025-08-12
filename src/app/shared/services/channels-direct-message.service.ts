import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, from, of, Observable } from 'rxjs';
import {
  Firestore, getDoc, collectionData, collection, doc, setDoc, query, where, getDocs, writeBatch, Timestamp, orderBy, limit, serverTimestamp, addDoc, CollectionReference, QueryConstraint, DocumentData,
} from '@angular/fire/firestore';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Channel } from '../../interfaces/channel.interface';
import { appUser } from '../../interfaces/user.interface';
import { Reactions } from '../../interfaces/reactions.interface';

export interface DirectMessage {
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

  // --- Static Data (Consider if these should be dynamic) ---
  private channelsForGast: string[] = ['Entwicklerteam', 'Office-Team'];
  private directMessagesForGast: DirectMessage[] = [
    { name: 'Frederik Beck (Du)', img: '3.png', status: 'online' },
    { name: 'Sofia Müller', img: '5.png', status: 'online' },
    { name: 'Noah Braun', img: '6.png', status: 'online' },
    { name: 'Elise Roth', img: '1.png', status: 'offline' },
    { name: 'Elias Neumann', img: '2.png', status: 'online' },
    { name: 'Steffen Hoffmann', img: '4.png', status: 'online' },
  ];
  private channels: Channel[] = [
    { channelId: 'T4GIOzIalU8W0In7whdV', name: 'Entwicklerteam', createdBy: 'NLErynp0gVTC1QIsBDnx', members: ['user1', 'user2', 'user3'], description: 'Channel des Entwicklerteams' },
    { channelId: 'ABC123', name: 'Office-Team', createdBy: 'xyz', members: ['userA', 'userB'] },
  ];

  // --- Behavior Subjects for Selected Items ---
  private selectedChannelSource = new BehaviorSubject<Channel | null>(null);
  selectedChannel$ = this.selectedChannelSource.asObservable();

  private selectedDirectMessageSource = new BehaviorSubject<appUser | null>(null);
  selectedDirectMessage$ = this.selectedDirectMessageSource.asObservable();

  // --- Public Getters for Static Data ---
  getChannels(): Channel[] { return this.channels; }
  setSelectedChannel(channel: Channel): void { this.selectedChannelSource.next(channel); }
  getSelectedChannel(): Channel | null { return this.selectedChannelSource.value; }
  getChannelsForGast(): string[] { return this.channelsForGast; }
  getDirectMessagesForGast(): DirectMessage[] { return this.directMessagesForGast; }
  setSelectedDirectMessage(user: appUser): void { this.selectedDirectMessageSource.next(user); }

  // --- Private Firestore Collection Helpers ---
  private getChannelMessagesCollection(channelId: string): CollectionReference {
    return collection(this.firestore, `channels/${channelId}/messages`);
  }

  getChannelThreadMessagesCollection(channelId: string, messageId: string): CollectionReference {
    return collection(this.firestore, `channels/${channelId}/messages/${messageId}/threadMessages`);
  }

  private getConversationMessagesCollection(conversationId: string): CollectionReference {
    return collection(this.firestore, `conversations/${conversationId}/directMessages`);
  }

  private getConversationThreadMessagesCollection(conversationId: string, parentMessageId: string): CollectionReference {
    return collection(this.firestore, `conversations/${conversationId}/directMessages/${parentMessageId}/threadMessages`);
  }

  // --- Generic Data Fetching ---
  getData<T>(collectionRef: CollectionReference, options?: { idField?: string, queryConstraints?: QueryConstraint[] }): Observable<T[]> {
    let q = query(collectionRef);
    if (options?.queryConstraints) {
      q = query(collectionRef, ...options.queryConstraints);
    }
    return collectionData(q, { idField: options?.idField || 'id' }).pipe(
      map((docs: DocumentData[]) => docs.map(doc => doc as T)), // <--- Map each document to type T
      catchError((error) => {
        console.error('Error fetching data:', error);
        return of([]);
      })
    );
  }

  // --- User Details ---
  private getUserDetails(senderID: string): Observable<any> {
    if (!senderID) return of(null);
    const userDocRef = doc(this.firestore, 'users', senderID);
    return from(getDoc(userDocRef)).pipe(
      map((docSnapshot) => (docSnapshot.exists() ? docSnapshot.data() : null)),
      catchError((error) => {
        console.error(`Error fetching user data for ${senderID}:`, error);
        return of(null);
      })
    );
  }

  fetchReactorName(reactorID: string | undefined): Promise<string> {
    if (!reactorID || typeof reactorID !== 'string' || reactorID.trim() === '') {
      console.warn('fetchReactorName called with invalid reactorID:', reactorID);
      return Promise.resolve('Unknown User');
    }
    const userDocRef = doc(this.firestore, 'users', reactorID);
    return getDoc(userDocRef)
      .then((docSnap) => (docSnap.exists() ? docSnap.data()?.['userName'] || 'Unknown User' : 'Unknown User'))
      .catch((error) => {
        console.error('Error fetching reactor name for', reactorID, error);
        return 'Unknown User';
      });
  }

  // --- Timestamp Formatting ---
  private formatTimestamp(timestamp: any): string {
    if (timestamp && timestamp.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return '';
  }

  // --- Message Fetching ---
  getMessages(channelId: string): Observable<any[]> {
    return this.getData(this.getChannelMessagesCollection(channelId));
  }

  getConversationMessages(conversationId: string): Observable<any[]> {
    return this.getData(this.getConversationMessagesCollection(conversationId), {
      queryConstraints: [orderBy('timestamp', 'asc')]
    });
  }

  getThreadMessages(channelId: string, threadMessageId: string): Observable<any[]> {
    return this.getData(this.getChannelThreadMessagesCollection(channelId, threadMessageId));
  }

  getConversationThreadMessages(conversationId: string, parentMessageId: string): Observable<any[]> {
    return this.getData(this.getConversationThreadMessagesCollection(conversationId, parentMessageId));
  }

  // --- Thread Message Counts and Latest ---
  getThreadMessageCount(channelId: string, parentMessageId: string): Observable<number> {
    return this.getData(this.getChannelThreadMessagesCollection(channelId, parentMessageId)).pipe(
      map((messages) => messages.length),
      catchError(() => of(0))
    );
  }

  getLatestThreadMessage(channelId: string, messageId: string): Observable<any> {
    return this.getData(this.getChannelThreadMessagesCollection(channelId, messageId), {
      queryConstraints: [orderBy('timestamp', 'desc'), limit(1)]
    }).pipe(
      map((messages) => (messages.length > 0 ? messages[0] : null))
    );
  }

  // --- Message Enrichment (Centralized) ---
  enrichMessage(contextId: string, message: any): Observable<EnrichedMessage> {
    const userDetails$ = message.senderID
      ? this.getUserDetails(message.senderID).pipe(catchError(() => of(null)))
      : of(null);

    const reactions$ = this.getReactionsForMessage(contextId, message.id).pipe(
      catchError(() => of([]))
    );

    const isChannelMainMessage = message.id && !message.parentMessageId && contextId.length > 10;
    const answersCount$ = isChannelMainMessage ? this.getThreadMessageCount(contextId, message.id) : of(0);
    const lastAnswer$ = isChannelMainMessage ? this.getLatestThreadMessage(contextId, message.id) : of(null);

    return combineLatest([
      userDetails$,
      reactions$,
      answersCount$,
      lastAnswer$,
    ]).pipe(
      map(([userDetails, reactions, answersCount, lastAnswer]) => ({
        ...message,
        formattedTime: this.formatTimestamp(message.timestamp),
        username: userDetails?.userName || 'Unknown User',
        avatar: userDetails?.profilePic || 'default-avatar.png',
        reactions: reactions || [],
        answersCount: answersCount || 0,
        lastAnswerTime: lastAnswer ? this.formatTimestamp(lastAnswer.timestamp) : null,
      }))
    );
  }

  // --- Enriched Message Streams ---
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
  private async getContextType(id: string): Promise<'channel' | 'conversation' | 'unknown'> {
    const channelDocRef = doc(this.firestore, `channels/${id}`);
    const channelDocSnap = await getDoc(channelDocRef);
    if (channelDocSnap.exists()) return 'channel';

    const conversationDocRef = doc(this.firestore, `conversations/${id}`);
    const conversationDocSnap = await getDoc(conversationDocRef);
    if (conversationDocSnap.exists()) return 'conversation';

    return 'unknown';
  }

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

  async toggleReaction(
    channelOrConversationId: string,
    messageId: string,
    reactionType: string,
    reactorID: string
  ): Promise<void> {
    if (!reactorID) {
      console.error('toggleReaction called with invalid reactorID:', reactorID);
      return;
    }

    const contextType = await this.getContextType(channelOrConversationId);
    let reactionsCollection: CollectionReference;

    if (contextType === 'channel') {
      reactionsCollection = collection(this.firestore, `channels/${channelOrConversationId}/messages/${messageId}/reactions`);
    } else if (contextType === 'conversation') {
      reactionsCollection = collection(this.firestore, `conversations/${channelOrConversationId}/directMessages/${messageId}/reactions`);
    } else {
      console.error('Unknown context type for ID:', channelOrConversationId);
      return;
    }
    await this.toggleReactionInCollection(reactionsCollection, reactionType, reactorID);
  }

  private async toggleReactionInCollection(
    reactionsCollection: CollectionReference,
    reactionType: string,
    reactorID: string
  ): Promise<void> {
    const existingReactions = await getDocs(
      query(reactionsCollection, where('type', '==', reactionType), where('reactorID', '==', reactorID))
    );
    if (!existingReactions.empty) {
      const batch = writeBatch(this.firestore);
      existingReactions.forEach((docSnap) => batch.delete(docSnap.ref));
      await batch.commit();
      console.log('Reaction removed for reactorID:', reactorID);
    } else {
      await setDoc(doc(reactionsCollection), {
        reactorID,
        type: reactionType,
        timestamp: Timestamp.now(),
      } as Reactions);
      console.log('Reaction added for reactorID:', reactorID);
    }
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
    console.log('Thread message sent to:', threadMessageId);
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
      console.log('Thread message added to DM')
    );
  }

  async getChannelById(channelId: string): Promise<any> {
    const channelRef = doc(this.firestore, `channels/${channelId}`);
    const snap = await getDoc(channelRef);
    return snap.exists() ? { channelId, ...snap.data() } : null;
  }
}
