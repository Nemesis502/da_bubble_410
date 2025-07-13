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

  private currentUserId: string = '';
  private directMessagePartnerIds: string[] = [];

  constructor(private data: ChannelsDirectMessageService) { }

  setCurrentUserId(userId: string) {
    this.currentUserId = userId;
  }

  setDirectMessagePartnerIds(conversations: any[], currentUserId: string) {
    this.directMessagePartnerIds = conversations
      .map(conv => conv.participants.find((id: string) => id !== currentUserId))
      .filter((id): id is string => typeof id === 'string');
  }

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

    return this.firestoreChannels
      .filter(c =>
        c.name.toLowerCase().includes(query) &&
        c.members.includes(this.currentUserId)
      );
  }

  filterFirestoreDirectMessages(searchTerm: string): appUser[] {
    const query = searchTerm.toLowerCase();

    return this.firestoreUsers.filter(u =>
      !!u.id &&
      this.directMessagePartnerIds.includes(u.id) &&
      u.userName.toLowerCase().includes(query)
    );
  }
}