import { Injectable } from '@angular/core';
import { ChannelsDirectMessageService, DirectMessage } from './channels-direct-message.service';
import { Channel } from '../../interfaces/channel.interface';
import { User } from '../../interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private firestoreChannels: Channel[] = [];
  private firestoreUsers: User[] = [];

  constructor(private data: ChannelsDirectMessageService) { }

  filterChannels(searchTerm: string): string[] {
    const query = searchTerm.toLowerCase();
    return this.data.getChannels().filter(c =>
      c.toLowerCase().includes(query)
    );
  }

  filterDirectMessages(searchTerm: string): DirectMessage[] {
    const query = searchTerm.toLowerCase();
    return this.data.getDirectMessages().filter(dm =>
      dm.name.toLowerCase().includes(query)
    );
  }

  setFirestoreChannels(channels: Channel[]) {
    this.firestoreChannels = channels;
  }

  setFirestoreUsers(users: User[]) {
    this.firestoreUsers = users;
  }

  filterFirestoreChannels(searchTerm: string): Channel[] {
    const query = searchTerm.toLowerCase();
    return this.firestoreChannels.filter(c =>
      c.name.toLowerCase().includes(query)
    );
  }

  filterFirestoreDirectMessages(searchTerm: string): User[] {
    const query = searchTerm.toLowerCase();
    return this.firestoreUsers.filter(u =>
      u.userName.toLowerCase().includes(query)
    );
  }
}