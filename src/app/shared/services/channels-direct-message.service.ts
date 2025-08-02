import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, from, of } from 'rxjs';
import {
  Firestore,
  getDoc,
  collectionData,
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  writeBatch,
  Timestamp,
  orderBy,
  limit,
  serverTimestamp,
  addDoc,
  CollectionReference,
} from '@angular/fire/firestore';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Channel } from '../../interfaces/channel.interface';
import { appUser } from '../../interfaces/user.interface';

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

interface EnrichedMessage {
  id: string;
  text: string;
  timestamp: any;
  senderID: string;
  formattedTime: string;
  username: string;
  avatar: string;
  [key: string]: any; 
}

@Injectable({
  providedIn: 'root',
})
export class ChannelsDirectMessageService {
  constructor(private firestore: Firestore) {}

  private channelsForGast: string[] = ['Entwicklerteam', 'Office-Team'];

  private directMessagesForGast: DirectMessage[] = [
    {
      name: 'Frederik Beck (Du)',
      img: '3.png',
      status: 'online',
    },
    {
      name: 'Sofia Müller',
      img: '5.png',
      status: 'online',
    },
    {
      name: 'Noah Braun',
      img: '6.png',
      status: 'online',
    },
    {
      name: 'Elise Roth',
      img: '1.png',
      status: 'offline',
    },
    {
      name: 'Elias Neumann',
      img: '2.png',
      status: 'online',
    },
    {
      name: 'Steffen Hoffmann',
      img: '4.png',
      status: 'online',
    },
  ];

  private channels: Channel[] = [
    {
      channelId: 'T4GIOzIalU8W0In7whdV',
      name: 'Entwicklerteam',
      createdBy: 'NLErynp0gVTC1QIsBDnx',
      members: ['user1', 'user2', 'user3'],
      description: 'Channel des Entwicklerteams',
    },
    {
      channelId: 'ABC123',
      name: 'Office-Team',
      createdBy: 'xyz',
      members: ['userA', 'userB'],
    },
  ];

  private selectedChannelSource = new BehaviorSubject<any>(null);
  selectedChannel$ = this.selectedChannelSource.asObservable();

  getChannels(): Channel[] {
    return this.channels;
  }

  setSelectedChannel(channel: Channel): void {
    this.selectedChannelSource.next(channel);
  }

  getSelectedChannel(): Channel | null {
    return this.selectedChannelSource.value;
  }

  getChannelsForGast(): string[] {
    return this.channelsForGast;
  }

  getDirectMessagesForGast(): DirectMessage[] {
    return this.directMessagesForGast;
  }

  getMessages(channelId: string): Observable<any[]> {
    const messagesSubcollection = collection(
      this.firestore,
      `channels/${channelId}/messages`
    );
    return collectionData(messagesSubcollection, { idField: 'id' });
  }



  async getChannelById(channelId: string): Promise<any> {
    const channelRef = doc(this.firestore, `channels/${channelId}`);
    const snap = await getDoc(channelRef);
    return snap.exists() ? { channelId, ...snap.data() } : null;
  }


  getEnrichedMessages(channelId: string): Observable<any[]> {
    return this.getMessages(channelId).pipe(
      switchMap((messages) => {
        if (!messages.length) return of([]);

        const enrichedMessages$ = messages.map((message) =>
          this.enrichMessage(channelId, message)
        );

        return combineLatest(enrichedMessages$).pipe(
          map((enrichedMessages) =>
            enrichedMessages.sort((a, b) => {
              const timeA = a.timestamp?.seconds ?? 0;
              const timeB = b.timestamp?.seconds ?? 0;
              return timeA - timeB;
            })
          )
        );
      })
    );
  }

 
 

  getLatestThreadMessage(
    channelId: string,
    messageId: string
  ): Observable<any> {
    const threadMessagesCollection = collection(
      this.firestore,
      `channels/${channelId}/messages/${messageId}/threadMessages`
    );

    const q = query(
      threadMessagesCollection,
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map((messages) => (messages.length > 0 ? messages[0] : null))
    );
  }

  getThreadMessageCount(
    channelId: string,
    parentMessageId: string
  ): Observable<number> {
    const threadMessagesCollection = collection(
      this.firestore,
      `channels/${channelId}/messages/${parentMessageId}/threadMessages`
    );
    return collectionData(threadMessagesCollection).pipe(
      map((messages) => messages.length),
      catchError(() => of(0))
    );
  }

  private getUserDetails(senderID: string): Observable<any> {
    if (!senderID) {
      return of(null);
    }
    const userDocRef = doc(this.firestore, 'users', senderID);
    return from(getDoc(userDocRef)).pipe(
      map((docSnapshot) => (docSnapshot.exists() ? docSnapshot.data() : null)),
      catchError((error) => {
        console.error(`Error fetching user data for ${senderID}:`, error);
        return of(null);
      })
    );
  }

  private formatTimestamp(timestamp: any): string {
    if (timestamp && timestamp.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return '';
  }  
  
  fetchReactorName(reactorID: string | undefined): Promise<string> {
    if (
      !reactorID ||
      typeof reactorID !== 'string' ||
      reactorID.trim() === ''
    ) {
      console.warn(
        'fetchReactorName called with invalid reactorID:',
        reactorID
      );
      return Promise.resolve('Unknown User');
    }

    const userDocRef = doc(this.firestore, 'users', reactorID);
    return getDoc(userDocRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          return data ? data['userName'] || 'Unknown User' : 'Unknown User';
        }
        return 'Unknown User';
      })
      .catch((error) => {
        console.error('Error fetching reactor name for', reactorID, error);
        return 'Unknown User';
      });
  }

  fetchMessageReactions(
    channelId: string,
    messageId: string
  ): Observable<any[]> {
    const reactionsCollection = collection(
      this.firestore,
      `channels/${channelId}/messages/${messageId}/reactions`
    );

    return collectionData(reactionsCollection, { idField: 'reactionID' }).pipe(
      catchError((error) => {
        console.error('Error fetching reactions:', error);
        return of([]);
      })
    );
  }

   getEnrichedThreadMessages(
    channelId: string,
    parentMessageId: string
  ): Observable<any[]> {
    return this.getThreadMessages(channelId, parentMessageId).pipe(
      switchMap((messages) => {
        if (!messages.length) return of([]);

        const enrichedMessages$ = messages.map((message) => {
          const userDetails$ = message.senderID
            ? this.getUserDetails(message.senderID).pipe(
                catchError(() => of(null))
              )
            : of(null);

          const reactions$ = this.getReactionsForMessage(
            channelId,
            message.id
          ).pipe(catchError(() => of([])));

          return combineLatest([userDetails$, reactions$]).pipe(
            map(([userDetails, reactions]) => ({
              ...message,
              formattedTime: this.formatTimestamp(message.timestamp),
              username: userDetails?.userName || 'Unknown User',
              avatar: userDetails?.profilePic || 'default-avatar.png',
              reactions: reactions || [],
            }))
          );
        });

        return combineLatest(enrichedMessages$).pipe(
          map((enrichedMessages) =>
            enrichedMessages.sort((a, b) => {
              const timeA = a.timestamp?.seconds ?? 0;
              const timeB = b.timestamp?.seconds ?? 0;
              return timeA - timeB;
            })
          )
        );
      })
    );
  }

  enrichMessage(channelId: string, message: any): Observable<any> {
    const userDetails$ = message.senderID
      ? this.getUserDetails(message.senderID).pipe(catchError(() => of(null)))
      : of(null);

    const reactions$ = this.getReactionsForMessage(channelId, message.id).pipe(
      catchError(() => of([]))
    );
    const answersCount$ = this.getThreadMessageCount(channelId, message.id);
    const lastAnswer$ = this.getLatestThreadMessage(channelId, message.id).pipe(
      catchError(() => of(null))
    );

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
        lastAnswerTime: lastAnswer
          ? this.formatTimestamp(lastAnswer.timestamp)
          : null,
      }))
    );
  }
getReactionsForMessage(
  contextId: string,
  messageId: string
): Observable<any[]> {
  return from(this.getContextType(contextId)).pipe(
    switchMap((contextType) => {
      let reactionsCollection;
      if (contextType === 'channel') {
        reactionsCollection = collection(
          this.firestore,
          `channels/${contextId}/messages/${messageId}/reactions`
        );
      } else if (contextType === 'conversation') {
        console.log('gettin reaction for convo')
        reactionsCollection = collection(
          this.firestore,
          `conversations/${contextId}/directMessages/${messageId}/reactions`
        );
      } else {
        return of([]);
      }

      return collectionData(reactionsCollection, { idField: 'reactionID' }).pipe(
        catchError((error) => {
          console.error('Error fetching reactions:', error);
          return of([]);
        })
      );
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

  if (contextType === 'channel') {
    await this.toggleChannelReaction(channelOrConversationId, messageId, reactionType, reactorID);
  } else if (contextType === 'conversation') {
    await this.toggleConversationReaction(channelOrConversationId, messageId, reactionType, reactorID);
  } else {
    console.error('Unknown context type for ID:', channelOrConversationId);
  }
}
private async getContextType(id: string): Promise<'channel' | 'conversation' | 'unknown'> {
  const channelDocRef = doc(this.firestore, `channels/${id}`);
  const channelDocSnap = await getDoc(channelDocRef);

  if (channelDocSnap.exists()) {
    return 'channel';
  }

  const conversationDocRef = doc(this.firestore, `conversations/${id}`);
  const conversationDocSnap = await getDoc(conversationDocRef);

  if (conversationDocSnap.exists()) {
    return 'conversation';
  }

  return 'unknown';
}
private async toggleChannelReaction(
  channelId: string,
  messageId: string,
  reactionType: string,
  reactorID: string
): Promise<void> {
  const reactionsCollection = collection(
    this.firestore,
    `channels/${channelId}/messages/${messageId}/reactions`
  );

  await this.toggleReactionInCollection(reactionsCollection, reactionType, reactorID);
}
private async toggleConversationReaction(
  conversationId: string,
  messageId: string,
  reactionType: string,
  reactorID: string
): Promise<void> {
  const reactionsCollection = collection(
    this.firestore,
    `conversations/${conversationId}/directMessages/${messageId}/reactions`
  );
  await this.toggleReactionInCollection(reactionsCollection, reactionType, reactorID);
}
private async toggleReactionInCollection(
  reactionsCollection: CollectionReference,
  reactionType: string,
  reactorID: string
): Promise<void> {
  const q = query(
    reactionsCollection,
    where('type', '==', reactionType),
    where('reactorID', '==', reactorID)
  );

  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const batch = writeBatch(this.firestore);
    querySnapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
    console.log('Reaction removed for reactorID:', reactorID);
  } else {
    const newReactionRef = doc(reactionsCollection);
    await setDoc(newReactionRef, {
      reactorID,
      type: reactionType,
      timestamp: Timestamp.now(),
    });
    console.log('Reaction added for reactorID:', reactorID);
  }
}


  private selectedDirectMessageSource = new BehaviorSubject<appUser | null>(
    null
  );
  selectedDirectMessage$ = this.selectedDirectMessageSource.asObservable();

  setSelectedDirectMessage(user: appUser): void {
    this.selectedDirectMessageSource.next(user);
  }

  getThreadMessages(
    channelId: string,
    threadMessageId: string
  ): Observable<any[]> {
    const threadMessagesCollection = collection(
      this.firestore,
      `channels/${channelId}/messages/${threadMessageId}/threadMessages`
    );

    return collectionData(threadMessagesCollection, { idField: 'id' }).pipe(
      catchError((error) => {
        console.error('Error fetching thread messages:', error);
        return of([]);
      })
    );
  }

  async sendThreadMessage(
    channelId: string,
    threadMessageId: string,
    text: string,
    senderID: string
  ): Promise<void> {
    const threadMessagesCollection = collection(
      this.firestore,
      `channels/${channelId}/messages/${threadMessageId}/threadMessages`
    );

    const newMessageRef = doc(threadMessagesCollection);
    await setDoc(newMessageRef, {
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
    const threadCollection = collection(
      this.firestore,
      `conversations/${conversationId}/directMessages/${parentMessageId}/threadMessages`
    );

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

  getEnrichedConversationThreadMessages(
   conversationId: string,
  parentMessageId: string
): Observable<EnrichedMessage[]> {
  const threadCollection = collection(
    this.firestore,
    `conversations/${conversationId}/directMessages/${parentMessageId}/threadMessages`
  );

  const q = query(threadCollection, orderBy('timestamp'));

  return collectionData(q, { idField: 'id' }).pipe(
    switchMap((messages: any[]) => {
      if (!messages.length) return of([]);

      const enrichedMessages$ = messages.map((message) => {
        const userDetails$ = message.senderID
          ? this.getUserDetails(message.senderID).pipe(
              catchError(() => of(null))
            )
          : of(null);

        const reactions$ = this.getReactionsForConversationMessage(
          conversationId,
          message.id
        ).pipe(catchError(() => of([])));

        return combineLatest([userDetails$, reactions$]).pipe(
          map(([userDetails, reactions]): EnrichedMessage => ({
            ...message,
            formattedTime: this.formatTimestamp(message.timestamp),
            username: userDetails?.userName || 'Unknown User',
            avatar: userDetails?.profilePic || 'default-avatar.png',
            reactions: reactions || [],
          }))
        );
      });

      return combineLatest(enrichedMessages$).pipe(
        map((enrichedMessages: EnrichedMessage[]) =>
          enrichedMessages.sort((a, b) => {
            const timeA = a.timestamp?.seconds ?? 0;
            const timeB = b.timestamp?.seconds ?? 0;
            return timeA - timeB;
          })
        )
      );
    }),
    catchError((error) => {
      console.error('Error enriching conversation thread messages:', error);
      return of([]);
    })
  );
}
getConversationThreadMessages(
  conversationId: string,
  parentMessageId: string
): Observable<any[]> {
  const threadMessagesCollection = collection(
    this.firestore,
    `conversations/${conversationId}/directMessages/${parentMessageId}/threadMessages`
  );

  return collectionData(threadMessagesCollection, { idField: 'id' }).pipe(
    catchError((error) => {
      console.error('Error fetching conversation thread messages:', error);
      return of([]);
    })
  );
}


  getConversationMessages(conversationId: string): Observable<any[]> {
    const messagesCol = collection(
      this.firestore,
      `conversations/${conversationId}/directMessages`
    );

    const q = query(messagesCol, orderBy('timestamp', 'asc'));

    return collectionData(q, { idField: 'id' }).pipe(
      catchError((error) => {
        console.error('Error fetching conversation messages:', error);
        return of([]);
      })
    );
  }

  getEnrichedConversationMessages(conversationId: string): Observable<any[]> {
  const messagesCol = collection(
    this.firestore,
    `conversations/${conversationId}/directMessages`
  );

  const q = query(messagesCol, orderBy('timestamp', 'asc'));

  return collectionData(q, { idField: 'id' }).pipe(
    map((docs) => docs as DirectMessageRaw[]),
    switchMap((messages) => {
      if (!messages.length) return of([]);

      const enrichedMessages$ = messages.map((message) => {
        const userDetails$ = message.senderID
          ? this.getUserDetails(message.senderID).pipe(
              catchError(() => of(null))
            )
          : of(null);

     const reactions$ = message.id
  ? this.getReactionsForConversationMessage(conversationId, message.id).pipe(
      catchError(() => of([]))
    )
  : of([]);


        return combineLatest([userDetails$, reactions$]).pipe(
          map(([userDetails, reactions]) => ({
            ...message,
            formattedTime: this.formatTimestamp(message.timestamp),
            username: userDetails?.userName || 'Unknown User',
            avatar: userDetails?.profilePic || 'default-avatar.png',
            reactions: reactions || [],
          }))
        );
      });

      return combineLatest(enrichedMessages$).pipe(
        map((enrichedMessages) =>
          enrichedMessages.sort((a, b) => {
            const timeA = a.timestamp?.seconds ?? 0;
            const timeB = b.timestamp?.seconds ?? 0;
            return timeA - timeB;
          })
        )
      );
    }),
    catchError((error) => {
      console.error('Error enriching conversation messages:', error);
      return of([]);
    })
  );
}
getReactionsForConversationMessage(conversationId: string, messageId: string): Observable<any[]> {
  const reactionsCollection = collection(
    this.firestore,
    `conversations/${conversationId}/directMessages/${messageId}/reactions`
  );

  return collectionData(reactionsCollection, { idField: 'reactionID' }).pipe(
    catchError((error) => {
      console.error('Error fetching reactions:', error);
      return of([]);
    })
  );
}

}
