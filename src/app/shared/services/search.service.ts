import { Injectable } from '@angular/core';
import { ChannelsDirectMessageService, DirectMessage } from './channels-direct-message.service';
import { Channel } from '../../interfaces/channel.interface';
import { appUser } from '../../interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private firestoreChannels: Channel[] = [];
  private firestoreUsers: appUser[] = [];

  constructor(private data: ChannelsDirectMessageService) { }

  filterChannels(searchTerm: string): string[] {
    const query = searchTerm.toLowerCase();
    return this.data.getChannelsForGast().filter(c =>
      c.toLowerCase().includes(query)
    );
  }

  filterDirectMessages(searchTerm: string): DirectMessage[] {
    const query = searchTerm.toLowerCase();
    return this.data.getDirectMessagesForGast().filter(dm =>
      dm.name.toLowerCase().includes(query)
    );
  }

  setFirestoreChannels(channels: Channel[]) {
    this.firestoreChannels = channels;
  }

  setFirestoreUsers(users: appUser[]) {
    this.firestoreUsers = users;
  }

  filterFirestoreChannels(searchTerm: string): Channel[] {
    const query = searchTerm.toLowerCase();
    return this.firestoreChannels.filter(c =>
      c.name.toLowerCase().includes(query)
    );
  }

  filterFirestoreDirectMessages(searchTerm: string): appUser[] {
    const query = searchTerm.toLowerCase();
    return this.firestoreUsers.filter(u =>
      u.userName.toLowerCase().includes(query)
    );
  }
}