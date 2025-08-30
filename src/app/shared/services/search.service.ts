import { Injectable } from '@angular/core';
import { ChannelsDirectMessageService } from './channels-direct-message.service';
import { Channel } from '../../interfaces/channel.interface';
import { appUser } from '../../interfaces/user.interface';
import { SearchResults } from '../../interfaces/search-results.interface';
import { firstValueFrom } from 'rxjs';
import { FirestoreService } from './firestore.service';

@Injectable({ providedIn: 'root' })
export class SearchService {
  firestoreChannels: Channel[] = [];
  firestoreUsers: appUser[] = [];
  currentUserId: string = '';
  directMessagePartnerIds: string[] = [];

  constructor(
    private data: ChannelsDirectMessageService,
    private firestoreService: FirestoreService
  ) { }

  setCurrentUserId(userId: string) {
    this.currentUserId = userId;
  }

  setDirectMessagePartnerIds(conversations: Array<{ participants: string[] }>, currentUserId: string) {
    this.directMessagePartnerIds = conversations
      .map(conv => conv.participants.find((id: string) => id !== currentUserId))
      .filter((id): id is string => id !== undefined);
  }

  setFirestoreChannels(channels: Channel[]) {
    this.firestoreChannels = channels;
  }

  setFirestoreUsers(users: appUser[]) {
    this.firestoreUsers = users;
  }

  /** Hauptmethode für Suche */
  async updateFilteredResults(
    searchTerm: string,
    gastLogin: boolean,
    directMessages: any[],
    currentLoginId: string
  ): Promise<SearchResults> {
    const term = searchTerm.trim().toLowerCase();
    const query = term.replace(/^[@#]/, '');
    const isChannelSearch = term.startsWith('#');
    const isDMSearch = term.startsWith('@');

    if (gastLogin) {
      const { channels, directMessages } = this.handleGuestSearch(query, isChannelSearch, isDMSearch);
      return {
        channels,
        directMessages,
        contentResults: [],
        directMessageResults: []
      };
    }

    const contentResults = !isChannelSearch && !isDMSearch
      ? await this.searchMessagesInMemberChannels(query)
      : [];

    const directMessageResults = !isChannelSearch && !isDMSearch
      ? await this.searchMessagesInDirectMessages(query, directMessages)
      : [];

    return {
      channels: isDMSearch ? [] : this.filterFirestoreChannels(query),
      directMessages: isChannelSearch ? [] : this.filterFirestoreDirectMessages(query, directMessages),
      contentResults,
      directMessageResults
    };
  }

  /** Gast-Suchen */
  private handleGuestSearch(query: string, isChannel: boolean, isDirect: boolean) {
    if (isChannel) return { channels: this.loadGuestChannel(query), directMessages: [] };
    if (isDirect) return { channels: [], directMessages: this.loadGuestDM(query) };
    return { channels: this.loadGuestChannel(query), directMessages: this.loadGuestDM(query) };
  }

  private loadGuestChannel(query: string) {
    return this.data.getChannels().filter(c => c.name.toLowerCase().startsWith(query));
  }

  private loadGuestDM(query: string) {
    return this.data.getDirectMessagesForGast().filter(dm => dm.name.toLowerCase().startsWith(query));
  }

  /** Firestore-Suchen */
  filterFirestoreChannels(searchTerm: string): Channel[] {
    const query = searchTerm.toLowerCase();
    return this.firestoreChannels.filter(c =>
      c.members.includes(this.currentUserId) &&
      (
        c.name.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query) ||
        c.messages?.some(msg => msg.text?.toLowerCase().includes(query))
      )
    );
  }

  filterFirestoreDirectMessages(searchTerm: string, directMessages: any[]): appUser[] {
    const query = searchTerm.toLowerCase();
    return this.firestoreUsers.filter(u =>
      !!u.id &&
      this.directMessagePartnerIds.includes(u.id) &&
      (u.userName.toLowerCase().includes(query) || this.hasDMText(u.id, query, directMessages))
    );
  }

  private hasDMText(userId: string, searchTerm: string, directMessages: any[]): boolean {
    const conv = directMessages.find(c =>
      c.participants?.includes(this.currentUserId) && c.participants.includes(userId)
    );
    if (!conv?.directMessages) return false;

    return Object.values(conv.directMessages)
      .some(msg => {
        const m = msg as { text?: string; timestamp?: any };
        return (m.text ?? '').toLowerCase().includes(searchTerm);
      });
  }

  /** Nachrichtensuche in Channels */
  private async searchMessagesInMemberChannels(
    query: string,
    perChannelLimit = 200,
    maxHitsPerChannel = 1
  ) {
    if (!query || !this.currentUserId) return [];
    const memberChannels = await firstValueFrom(this.firestoreService.getMemberChannels(this.currentUserId));
    const results = [];
    for (const ch of memberChannels) {
      if (!ch.channelId) continue;
      const msgs = await firstValueFrom(this.firestoreService.getRecentMessagesForChannel(ch.channelId, perChannelLimit));
      const hits = (msgs ?? [])
        .filter(m => (m.text ?? '').toLowerCase().includes(query.toLowerCase()))
        .slice(0, maxHitsPerChannel)
        .map(m => ({ id: m.id, text: m.text ?? '', timestamp: m.timestamp }));
      if (hits.length) results.push({ channel: ch, hits });
    }
    return results;
  }

  /** Nachrichtensuche in DMs */
  private async searchMessagesInDirectMessages(
    query: string,
    conversations: Array<{
      id: string;
      participants: string[];
      directMessages: Record<string, { text?: string; timestamp?: any; senderId?: string }>;
    }>,
    maxHitsPerConversation = 1
  ) {
    const results = [];
    const q = query.toLowerCase();
    for (const conv of conversations) {
      if (!conv.id || !conv.participants || !conv.directMessages) continue;
      const user = this.getOtherParticipant(conv.participants);
      if (!user) continue;

      const messages = Object.entries(conv.directMessages).map(([id, msg]) => ({
        id, text: msg.text ?? '', timestamp: msg.timestamp, senderId: msg.senderId
      }));

      const hits = messages.filter(m => m.text.toLowerCase().includes(q))
        .slice(0, maxHitsPerConversation)
        .map(m => ({ id: m.id, text: m.text, timestamp: m.timestamp }));

      if (hits.length) results.push({ conversationId: conv.id, user, hits });
    }
    return results;
  }

  private getOtherParticipant(participants: string[]): appUser | undefined {
    if (participants.length === 2 && participants[0] === participants[1]) {
      return this.firestoreUsers.find(u => u.id === this.currentUserId)
        || { id: this.currentUserId, userName: 'Du', profilePic: 0, status: true };
    }
    const otherId = participants.find(id => id !== this.currentUserId);
    return this.firestoreUsers.find(u => u.id === otherId);
  }
}