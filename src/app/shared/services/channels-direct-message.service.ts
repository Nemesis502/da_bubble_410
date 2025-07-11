import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, from, of } from 'rxjs';
import { Firestore, getDoc, collectionData, collection, doc, setDoc, deleteDoc, query, where, getDocs, writeBatch, Timestamp, } from '@angular/fire/firestore';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Channel } from '../../interfaces/channel.interface';

export interface DirectMessage {
  name: string;
  img: string;
  status: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChannelsDirectMessageService {
  constructor(private firestore: Firestore) { }

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
      description: 'Channel des Entwicklerteams'
    },
    {
      channelId: 'ABC123',
      name: 'Office-Team',
      createdBy: 'xyz',
      members: ['userA', 'userB']
    }
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

  getReactionsForMessage(
    channelId: string,
    messageId: string
  ): Observable<any[]> {
    const reactionsCollection = collection(
      this.firestore,
      `channels/${channelId}/messages/${messageId}/reactions`
    );
    return collectionData(reactionsCollection, { idField: 'reactionID' }).pipe(
      map((reactions) => {
        return reactions;
      }),
      catchError((error) => {
        console.error('Error fetching reactions:', error);
        return of([]);
      })
    );
  }

async getChannelById(channelId: string): Promise<any> {
  const channelRef = doc(this.firestore, `channels/${channelId}`);
  const snap = await getDoc(channelRef);
  return snap.exists() ? { channelId, ...snap.data() } : null;
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

  getEnrichedMessages(channelId: string): Observable<any[]> {
    return this.getMessages(channelId).pipe(
      switchMap((messages) => {
        if (!messages.length) {
          return of([]);
        }

        const enrichedMessagesObservables = messages.map((message) => {
          const userDetails$ = message.senderID
            ? this.getUserDetails(message.senderID).pipe(catchError(() => of(null)))
            : of(null);
          const reactions$ = this.getReactionsForMessage(channelId, message.id).pipe(catchError(() => of([])));

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

        return combineLatest(enrichedMessagesObservables).pipe(
          map((enrichedMessages) =>
            enrichedMessages.sort((a, b) => {
              const timeA = a.timestamp.seconds || 0;
              const timeB = b.timestamp.seconds || 0;
              return timeA - timeB; 
            })
          )
        );
      })
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

  async toggleReaction(
    channelId: string,
    messageId: string,
    reactionType: string,
    reactorID: string
  ): Promise<void> {
    if (!reactorID) {
      console.error('toggleReaction called with invalid reactorID:', reactorID);
      return;
    }

    console.log('Adding/removing reaction:', {
      channelId,
      messageId,
      reactionType,
      reactorID,
    });

    const reactionsCollection = collection(
      this.firestore,
      `channels/${channelId}/messages/${messageId}/reactions`
    );

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

}
