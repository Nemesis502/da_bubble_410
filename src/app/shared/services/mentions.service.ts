import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
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

  /** Fetch users for a channel, fallback to all users */
  async fetchMentionableUsers(channelId: string | null): Promise<MentionUser[]> {
    if (!channelId) return this.fetchAllUsers();

    const channelSnap = await getDoc(doc(this.firestore, `channels/${channelId}`));
    if (!channelSnap.exists()) return this.fetchAllUsers();

    const memberIds: string[] = channelSnap.data()?.['members'] || [];
    const users = await Promise.all(memberIds.map((id) => this.fetchUserById(id)));
    return users.filter(Boolean) as MentionUser[];
  }

  /** Fetch single user by ID */
  private async fetchUserById(userId: string): Promise<MentionUser | null> {
    const snap = await getDoc(doc(this.firestore, `users/${userId}`));
    if (!snap.exists()) return null;

    const data = snap.data();
    return {
      id: userId,
      userName: data?.['userName'] ?? 'Unknown',
      profilePic: data?.['profilePic'] || 'default',
      status: data?.['status'] ?? false,
    };
  }

  /** Fetch all users */
  private async fetchAllUsers(): Promise<MentionUser[]> {
    const usersCollectionRef = collection(this.firestore, 'users');
    const querySnapshot = await getDocs(usersCollectionRef);

    return querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userName: data['userName'] ?? 'Unknown',
        profilePic: data['profilePic'] || 'default',
        status: data['status'] ?? false,
      };
    });
  }

  /** Fetch all channels */
  async fetchAllChannels(): Promise<MentionChannel[]> {
    const channelsCol = collection(this.firestore, 'channels');
    const snapshot = await getDocs(channelsCol);

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      name: docSnap.data()['name'] ?? 'Unnamed Channel',
    }));
  }

  /** Filter users by term */
  filterUsers(users: MentionUser[], term: string): MentionUser[] {
    if (!term) return users;
    return users.filter((user) =>
      user.userName.toLowerCase().includes(term.toLowerCase())
    );
  }

  /** Filter channels by term */
  filterChannels(channels: MentionChannel[], term: string): MentionChannel[] {
    if (!term) return channels;
    return channels.filter((channel) =>
      channel.name.toLowerCase().includes(term.toLowerCase())
    );
  }

  /** Extract first @mention in text */
  extractMention(input: string): string | null {
    const match = input.match(/@([\wÀ-ÿ .'-]+)/);
    return match ? match[1].trim() : null;
  }

  /** Extract first #channel in text */
  extractChannel(input: string): string | null {
    const match = input.match(/#([^\s#@]+)/);
    return match ? match[1].trim() : null;
  }

  /** Extract last typed @mention keyword for autocomplete */
  extractLastMentionKeyword(text: string): string {
    const match = text.match(/@([\wÀ-ÿ .'-]*)$/);
    return match ? match[1] : '';
  }

  /** Extract last typed #hashtag keyword for autocomplete */
  extractLastHashtagKeyword(text: string): string {
    const match = text.match(/#([\wÀ-ÿ .'-]*)$/);
    return match ? match[1] : '';
  }

  /** Get currently typed mention or hashtag at cursor */
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

  // Example: extract all mentions starting with '@' in the input string
extractAllMentions(text: string): string[] {
  const mentionRegex = /@([\wÀ-ÿ .'-]+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1].trim());
  }
  return mentions;
}

  /** Fetch channels that the current user is a member of */
  async fetchUserChannels(userId: string): Promise<MentionChannel[]> {
    const channelsCol = collection(this.firestore, 'channels');
    const q = query(channelsCol, where('members', 'array-contains', userId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      name: docSnap.data()['name'] ?? 'Unnamed Channel',
    }));
  }

}
