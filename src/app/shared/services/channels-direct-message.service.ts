import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  collectionData
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

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

}
