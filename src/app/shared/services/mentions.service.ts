import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
} from '@angular/fire/firestore';

export interface MentionUser {
  id: string;
  userName: string;
  profilePic: string;
  status: boolean;
}

export interface MentionChannel {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class MentionService {
  constructor(private firestore: Firestore) {}

  /**
   * Fetches mentionable users for a given channel.
   * - If channel is null or missing, fetches all users.
   */
  async fetchMentionableUsers(channelId: string | null): Promise<MentionUser[]> {
    if (!channelId) return this.fetchAllUsers();

    const channelSnap = await getDoc(doc(this.firestore, `channels/${channelId}`));
    if (!channelSnap.exists()) return this.fetchAllUsers();

    const memberIds: string[] = channelSnap.data()['members'] || [];
    const users = await Promise.all(memberIds.map((id) => this.fetchUserById(id)));
    return users.filter(Boolean) as MentionUser[];
  }

  /**
   * Fetches a single user document by ID.
   */
  private async fetchUserById(userId: string): Promise<MentionUser | null> {
    const snap = await getDoc(doc(this.firestore, `users/${userId}`));
    if (!snap.exists()) return null;

    const data = snap.data();
    return {
      id: userId,
      userName: data['userName'],
      profilePic: data['profilePic'] || 'default',
      status: data['status'] ?? false,
    };
  }


  /**
   * Helper method to fetch all users from the Firestore "users" collection.
   */
  private async fetchAllUsers(): Promise<MentionUser[]> {
    const usersCollectionRef = collection(this.firestore, 'users');
    const querySnapshot = await getDocs(usersCollectionRef);

    return querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userName: data['userName'],
        profilePic: data['profilePic'] || 'default',
        status: data['status'] ?? false,
      };
    });
  }

  /**
   * Fetches all channels from the Firestore "channels" collection.
   * Used for hashtag mentions (#channel).
   */
  async fetchAllChannels(): Promise<MentionChannel[]> {
    const channelsCol = collection(this.firestore, 'channels');
    const snapshot = await getDocs(channelsCol);

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      name: docSnap.data()['name'] ?? 'Unnamed Channel',
    }));
  }

  /**
   * Filters a list of users based on a search term for @mentions.
   */
  filterUsers(users: MentionUser[], term: string): MentionUser[] {
    return users.filter((user) =>
      user.userName.toLowerCase().includes(term.toLowerCase())
    );
  }

  /**
   * Filters a list of channels based on a search term for #hashtags.
   */
  filterChannels(channels: MentionChannel[], term: string): MentionChannel[] {
    return channels.filter((channel) =>
      channel.name.toLowerCase().includes(term.toLowerCase())
    );
  }

  /**
   * Extracts the currently typed mention (`@`) or hashtag (`#`) term
   * from the message at the given cursor position.
   * Returns `null` if no valid trigger is found.
   */
  getCurrentTriggerTerm(
    message: string,
    cursorPos: number,
    triggerChar: '@' | '#'
  ): string | null {
    const textBefore = message.slice(0, cursorPos);
    const lastTriggerIndex = textBefore.lastIndexOf(triggerChar);
    if (lastTriggerIndex === -1) return null;

    const term = textBefore.slice(lastTriggerIndex + 1);
    if (term.includes(' ') || term.includes('@') || term.includes('#')) {
      return null;
    }

    return term.toLowerCase();
  }

  /**
   * Extracts the last typed @mention keyword from a text.
   * Example: "Hello @john" → returns "john".
   */
  extractLastMentionKeyword(text: string): string {
    const match = text.match(/@([\wÀ-ÿ .'-]*)$/);
    return match ? match[1] : '';
  }

  /**
   * Extracts the last typed #hashtag keyword from a text.
   * Example: "Join #general" → returns "general".
   */
  extractLastHashtagKeyword(text: string): string {
    const match = text.match(/#([\wÀ-ÿ .'-]*)$/);
    return match ? match[1] : '';
  }

  /**
   * Extracts the first @mention found in a string.
   * Example: "Hey @alice" → returns "alice".
   */
  extractMention(input: string): string | null {
    const match = input.match(/@([\wÀ-ÿ .'-]+)/);
    return match ? match[1].trim() : null;
  }

  /**
   * Extracts the first #channel found in a string.
   * Example: "Check out #news" → returns "news".
   */
  extractChannel(input: string): string | null {
    const match = input.match(/#([^\s#@]+)/);
    return match ? match[1].trim() : null;
  }
}
