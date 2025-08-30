import { Injectable } from '@angular/core';
import { ChannelsDirectMessageService } from './channels-direct-message.service';
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
    contentResults: Array<{ channel: Channel; hits: Array<{ id: string; text: string; timestamp: any }> }>;
    directMessageResults: Array<{ conversationId: string; user: appUser; hits: Array<{ id: string; text: string; timestamp: any }> }>;
  }> {
    const term = searchTerm.trim().toLowerCase();
    const query = term.replace(/^[@#]/, '');
    const isChannelSearch = term.startsWith('#');
    const isDMSearch = term.startsWith('@');

    if (gastLogin) {
      const { channels, directMessages } = this.filterAsGuest(query, isChannelSearch, isDMSearch);
      return { channels, directMessages, contentResults: [], directMessageResults: [] };
    }

    let contentResults: Array<{ channel: Channel; hits: Array<{ id: string; text: string; timestamp: any }> }> = [];
    let dmResults: Array<{ conversationId: string; user: appUser; hits: Array<{ id: string; text: string; timestamp: any }> }> = [];

    if (!isChannelSearch && !isDMSearch) {
      contentResults = await this.searchMessagesInMemberChannels(query);
      dmResults = await this.searchMessagesInDirectMessages(query, directMessages);
    }

    return {
      channels: isDMSearch ? [] :
        this.filterFirestoreChannels(query),
      directMessages: isChannelSearch ? [] :
        this.filterFirestoreDirectMessages(query, directMessages),
      contentResults,
      directMessageResults: dmResults
    };
  }

  /** Gast-Suchen */
  filterAsGuest(query: string, isChannel: boolean, isDirect: boolean) {
    if (isChannel) {
      return { channels: this.loadGuestChannel(query), directMessages: [] };
    } else if (isDirect) {
      return { channels: [], directMessages: this.loadGuestDM(query) };
    } else {
      return this.loadGuestDMAndChannel(query);
    }
  }

  loadGuestChannel(query: string) {
    return this.data.getChannels().filter(c => c.name.toLowerCase().startsWith(query));
  }

  loadGuestDM(query: string) {
    return this.data.getDirectMessagesForGast().filter(dm =>
      dm.name.toLowerCase().startsWith(query)
    );
  }

  loadGuestDMAndChannel(query: string) {
    return {
      channels: this.loadGuestChannel(query),
      directMessages: this.loadGuestDM(query),
    };
  }

  /** Firestore-Suchen */
  /** Filtert Channels inkl. Nachrichten */
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

  /** Filtert DMs inkl. Nachrichten */
  filterFirestoreDirectMessages(searchTerm: string, directMessages: any[]): appUser[] {
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
  directMessagesHasText(
    userId: string,
    searchTerm: string,
    directMessages: any[]
  ): boolean {
    const conversation = directMessages.find((conv: any) =>
      conv.participants && conv.participants.includes(this.currentUserId) &&
      conv.participants.includes(userId)
    );

    if (!conversation || !conversation.directMessages) return false;

    return Object.values(conversation.directMessages).some((msg: any) =>
      (msg.text ?? '').toLowerCase().includes(searchTerm)
    );
  }

  /** Nachrichtensuche in Mitglieds-Channels */
  async searchMessagesInMemberChannels(
    query: string,
    perChannelLimit = 200,
    maxHitsPerChannel = 1
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

  /** Nachrichtensuche in DMs */
  async searchMessagesInDirectMessages(
    query: string,
    conversations: Array<{
      id: string;
      participants: string[];
      directMessages: Record<string, { text?: string; timestamp?: any; senderId?: string }>;
    }>,
    maxHitsPerConversation = 1
  ): Promise<Array<{ conversationId: string; user: appUser; hits: Array<{ id: string; text: string; timestamp: any }> }>> {

    const q = query.toLowerCase();
    const results: Array<{ conversationId: string; user: appUser; hits: Array<{ id: string; text: string; timestamp: any }> }> = [];

    for (const conv of conversations) {
      if (!conv.id || !conv.participants || !conv.directMessages) continue;

      const participantIds: string[] = conv.participants;
      let user: appUser | undefined;

      if (participantIds.length === 2 && participantIds[0] === participantIds[1]) {
        user = this.firestoreUsers.find(u => u.id === this.currentUserId)
          || { id: this.currentUserId, userName: 'Du', profilePic: 0, status: true };
      } else {
        const otherUserId = participantIds.find((uid: string) => uid !== this.currentUserId);
        if (!otherUserId) continue;

        user = this.firestoreUsers.find(u => u.id === otherUserId);
        if (!user) continue;
      }

      const messages = Object.entries(conv.directMessages).map(([id, msg]) => ({
        id,
        text: msg.text ?? '',
        timestamp: msg.timestamp,
        senderId: msg.senderId
      }));

      const hits = messages
        .filter(m => m.text.toLowerCase().includes(q))
        .slice(0, maxHitsPerConversation)
        .map(m => ({ id: m.id, text: m.text, timestamp: m.timestamp }));

      if (hits.length) {
        results.push({ conversationId: conv.id, user, hits });
      }
    }

    return results;
  }
}