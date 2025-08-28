import { Injectable } from '@angular/core';
import { ChannelsDirectMessageService, DirectMessage } from './channels-direct-message.service';
import { Channel } from '../../interfaces/channel.interface';
import { appUser } from '../../interfaces/user.interface';
import { firstValueFrom } from 'rxjs';
import { FirestoreService } from './firestore.service';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  firestoreChannels: Channel[] = [];
  firestoreUsers: appUser[] = [];
  currentUserId: string = '';
  directMessagePartnerIds: string[] = [];

  constructor(private data: ChannelsDirectMessageService, private firestoreService: FirestoreService
  ) { }

  setCurrentUserId(userId: string) {
    this.currentUserId = userId;
  }

  setDirectMessagePartnerIds(conversations: any[], currentUserId: string) {
    this.directMessagePartnerIds = conversations
      .map(conv => conv.participants.find((id: string) => id !== currentUserId))
      .filter((id): id is string => typeof id === 'string');
  }

  setFirestoreChannels(channels: Channel[]) {
    this.firestoreChannels = channels;
  }

  setFirestoreUsers(users: appUser[]) {
    this.firestoreUsers = users;
  }

  /** Haupt-Methode für beide Komponenten */
  async updateFilteredResults(
    searchTerm: string,
    gastLogin: boolean,
    directMessages: any[],
    currentLoginId: string
  ): Promise<{
    channels: any[];
    directMessages: any[];
    contentResults: Array<{ channel: Channel; hits: Array<{ id: string; text: string; timestamp: any }> }>
  }> {
    const term = searchTerm.trim().toLowerCase();
    const isChannelSearch = term.startsWith('#');
    const isDirectSearch = term.startsWith('@');
    const query = term.replace(/^[@#]/, '');

    if (gastLogin) {
      const { channels, directMessages } = this.filterAsGuest(query, isChannelSearch, isDirectSearch);
      return { channels, directMessages, contentResults: [] }; // Gast hat keine Message-Suche
    }

    if (!directMessages || directMessages.length === 0) {
      return { channels: [], directMessages: [], contentResults: [] };
    }

    this.setDirectMessagePartnerIds(directMessages, currentLoginId);

    if (isChannelSearch) {
      return { channels: this.filterFirestoreChannels(query), directMessages: [], contentResults: [] };
    } else if (isDirectSearch) {
      return { channels: [], directMessages: this.filterFirestoreDirectMessages(query, directMessages), contentResults: [] };
    } else {
      // Hier werden die Channel-Nachrichten durchsucht
      const contentResults = await this.searchMessagesInMemberChannels(query);
      return {
        channels: this.filterFirestoreChannels(query),
        directMessages: this.filterFirestoreDirectMessages(query, directMessages),
        contentResults
      };
    }
  }

  /** Gast-Suchen */
  private filterAsGuest(query: string, isChannel: boolean, isDirect: boolean) {
    if (isChannel) {
      return { channels: this.loadGuestChannel(query), directMessages: [] };
    } else if (isDirect) {
      return { channels: [], directMessages: this.loadGuestDM(query) };
    } else {
      return this.loadGuestDMAndChannel(query);
    }
  }

  private loadGuestChannel(query: string) {
    return this.data.getChannels().filter(c => c.name.toLowerCase().startsWith(query));
  }

  private loadGuestDM(query: string) {
    return this.data.getDirectMessagesForGast().filter(dm =>
      dm.name.toLowerCase().startsWith(query)
    );
  }

  private loadGuestDMAndChannel(query: string) {
    return {
      channels: this.loadGuestChannel(query),
      directMessages: this.loadGuestDM(query),
    };
  }

  /** Firestore-Suchen */
  /** Filtert Channels inkl. Nachrichten */
  private filterFirestoreChannels(searchTerm: string): Channel[] {
    const query = searchTerm.toLowerCase();
    return this.firestoreChannels.filter(c =>
      c.members.includes(this.currentUserId) &&
      (
        c.name.toLowerCase().includes(query) ||                 // Name match
        c.description?.toLowerCase().includes(query) ||        // Beschreibung match
        c.messages?.some(msg => msg.text?.toLowerCase().includes(query)) // Nachrichten match
      )
    );
  }

  /** Filtert DMs inkl. Nachrichten */
  private filterFirestoreDirectMessages(searchTerm: string, directMessages: any[]): appUser[] {
    const query = searchTerm.toLowerCase();
    return this.firestoreUsers.filter(u =>
      !!u.id &&
      this.directMessagePartnerIds.includes(u.id) &&
      (
        u.userName.toLowerCase().includes(query) ||
        this.directMessagesHasText(u.id, query, directMessages)
      )
    );
  }


  /** Prüft, ob DM Nachrichten den Suchbegriff enthalten */
  private directMessagesHasText(
    userId: string,
    searchTerm: string,
    directMessages: any[]
  ): boolean {
    const conversation = directMessages.find(conv =>
      (conv.participants.includes(this.currentUserId) && conv.participants.includes(userId))
    );

    if (!conversation || !conversation.messages) return false;

    return conversation.messages.some((msg: any) =>
      msg.text?.toLowerCase().includes(searchTerm)
    );
  }

  /** Nachrichtensuche in Mitglieds-Channels */
  async searchMessagesInMemberChannels(
    query: string,
    perChannelLimit = 200,
    maxHitsPerChannel = 2
  ): Promise<Array<{ channel: Channel; hits: Array<{ id: string; text: string; timestamp: any }> }>> {
    if (!query || !this.currentUserId) return [];
    const q = query.toLowerCase();

    // Mitglieds-Channels abrufen
    const memberChannels = await firstValueFrom(
      this.firestoreService.getMemberChannels(this.currentUserId)
    );

    const results: Array<{ channel: Channel; hits: Array<{ id: string; text: string; timestamp: any }> }> = [];

    for (const ch of memberChannels) {
      if (!ch.channelId) continue;

      const msgs = await firstValueFrom(
        this.firestoreService.getRecentMessagesForChannel(ch.channelId, perChannelLimit)
      );

      const hits = (msgs ?? [])
        .filter(m => (m.text ?? '').toLowerCase().includes(q))
        .slice(0, maxHitsPerChannel)
        .map(m => ({
          id: m.id,
          text: m.text ?? '',
          timestamp: m.timestamp
        }));

      if (hits.length) results.push({ channel: ch, hits });
    }

    return results;
  }
}