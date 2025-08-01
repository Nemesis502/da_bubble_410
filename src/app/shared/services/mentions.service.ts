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

async fetchMentionableUsers(channelId: string | null): Promise<MentionUser[]> {
  if (!channelId) {
    return this.fetchAllUsers();
  }

  const channelDocRef = doc(this.firestore, `channels/${channelId}`);
  const channelDocSnap = await getDoc(channelDocRef);

  if (!channelDocSnap.exists()) {
    return this.fetchAllUsers();
  }

  const channelData = channelDocSnap.data();
  const memberIds: string[] = channelData['members'] || [];

  const userPromises = memberIds.map(async (userId) => {
    const userDocSnap = await getDoc(doc(this.firestore, `users/${userId}`));
    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      return {
        id: userId,
        userName: data['userName'],
        profilePic: data['profilePic'] || 'default',
        status: data['status'] ?? false,
      };
    }
    return null;
  });

  const users = await Promise.all(userPromises);
  return users.filter(Boolean) as MentionUser[];
}

// Helper method to fetch all users
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

  /** Fetches all channels that can be used as hashtags */
  async fetchAllChannels(): Promise<MentionChannel[]> {
    const channelsCol = collection(this.firestore, 'channels');
    const snapshot = await getDocs(channelsCol);

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      name: docSnap.data()['name'] ?? 'Unnamed Channel',
    }));
  }

  /** Filters a list of users based on a term (for @mentions) */
  filterUsers(users: MentionUser[], term: string): MentionUser[] {
    return users.filter((user) =>
      user.userName.toLowerCase().includes(term.toLowerCase())
    );
  }

  /** Filters a list of channels based on a term (for #hashtags) */
  filterChannels(channels: MentionChannel[], term: string): MentionChannel[] {
    return channels.filter((channel) =>
      channel.name.toLowerCase().includes(term.toLowerCase())
    );
  }

  /** Extracts the current mention or hashtag term from a message and cursor position */
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

  /** Extracts the last @mention keyword in a given text */
extractLastMentionKeyword(text: string): string {
  const match = text.match(/@([\wÀ-ÿ .'-]*)$/);
  return match ? match[1] : '';
}

/** Extracts the last #hashtag keyword in a given text */
extractLastHashtagKeyword(text: string): string {
  const match = text.match(/#([\wÀ-ÿ .'-]*)$/);
  return match ? match[1] : '';
}

/** Extracts a full @mention from a string */
extractMention(input: string): string | null {
  const match = input.match(/@([\wÀ-ÿ .'-]+)/);
  return match ? match[1].trim() : null;
}

/** Extracts a full #channel from a string */
extractChannel(input: string): string | null {
  const match = input.match(/#([^\s#@]+)/);
  return match ? match[1].trim() : null;
}

}
