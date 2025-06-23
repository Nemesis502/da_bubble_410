import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  Firestore,
  collection,
  query,
  where,
  doc,
  getDoc,
  collectionData
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { combineLatest, from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Message } from '../../interfaces/message.interface';
import { Reactions } from '../../interfaces/reactions.interface';



export interface DirectMessage {
  name: string;
  img: string;
  status: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChannelsDirectMessageService {
  constructor(private firestore: Firestore) {}
  private channels: string[] = ['Entwicklerteam', 'Office-Team'];

  private directMessages: DirectMessage[] = [
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

  private selectedChannelSource = new BehaviorSubject<any>(null);
  selectedChannel$ = this.selectedChannelSource.asObservable();

  setSelectedChannel(channel: any): void {
    this.selectedChannelSource.next(channel);
  }

  getSelectedChannel(): any {
    return this.selectedChannelSource.value;
  }

  getChannels(): string[] {
    return this.channels;
  }

  getDirectMessages(): DirectMessage[] {
    return this.directMessages;
  }


getMessages(channelId: string): Observable<any[]> {
  const messagesSubcollection = collection(this.firestore, `channels/${channelId}/messages`);
  return collectionData(messagesSubcollection, { idField: 'id' }); 
}

getReactionsForMessage(channelId: string, messageId: string): Observable<any[]> {
  const reactionsCollection = collection(this.firestore, `channels/${channelId}/messages/${messageId}/reactions`);
  return collectionData(reactionsCollection, { idField: 'reactionID' }).pipe(
    map((reactions) => {
      return reactions;
    }),
    catchError((error) => {
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
        const userDetails$ = this.getUserDetails(message.senderID).pipe(
          catchError((err) => {
            console.error('Error loading user details', err);
            return of(null);
          })
        );

        const reactions$ = this.getReactionsForMessage(channelId, message.id).pipe(
          catchError((err) => {
            console.error('Error loading reactions', err);
            return of([]);
          })
        );

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

      return combineLatest(enrichedMessagesObservables);
    })
  );
}

private getUserDetails(senderID: string): Observable<any> {
  const userDocRef = doc(this.firestore, 'users', senderID);
  return from(getDoc(userDocRef)).pipe(
    map(docSnapshot => (docSnapshot.exists() ? docSnapshot.data() : null)),
    catchError(error => {
      console.error(`Error fetching user data for ${senderID}:`, error);
      return of(null);
    })
  );
}

  private formatTimestamp(timestamp: any): string {
    if (timestamp && timestamp.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return '';
  }

}
