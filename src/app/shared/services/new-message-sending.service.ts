import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, where, getDocs } from '@angular/fire/firestore';
import { Router } from '@angular/router';

export interface MessagePayload {
  senderID: string;
  text: string;
  channelId?: string;
}

@Injectable({ providedIn: 'root' })
export class NewMessageSendingService {
  constructor(private firestore: Firestore, private router: Router) {}

  /** Send a direct message to a user, creating a conversation if needed */
  async sendDirectMessage(senderId: string, recipientId: string, text: string): Promise<string> {
    const conversationId = await this.getOrCreateConversation(senderId, recipientId);

    await this.addMessageToFirestore(`conversations/${conversationId}/directMessages`, {
      senderID: senderId,
      text
    });

    this.router.navigate([`/chat-container/conversation/${conversationId}`]);
    return conversationId;
  }

  /** Send a message to a channel */
  async sendChannelMessage(senderId: string, channelId: string, text: string): Promise<void> {
    await this.addMessageToFirestore(`channels/${channelId}/messages`, {
      senderID: senderId,
      channelId,
      text
    });

    this.router.navigate([`/chat-container/chat/${channelId}`]);
  }

  /** Add a message to a Firestore collection with timestamp */
  private async addMessageToFirestore(collectionPath: string, message: any): Promise<void> {
    const msgCol = collection(this.firestore, collectionPath);
    await addDoc(msgCol, { ...message, timestamp: new Date() });
  }

  /** Get existing conversation between two users or create a new one */
  private async getOrCreateConversation(userA: string, userB: string): Promise<string> {
    const convRef = collection(this.firestore, 'conversations');
    const q = query(convRef, where('participants', 'array-contains', userA));
    const snapshot = await getDocs(q);

    const existing = snapshot.docs.find(doc => {
      const participants = doc.data()['participants'] as string[];
      return participants.includes(userB);
    });

    if (existing) return existing.id;

    const newConv = await addDoc(convRef, { participants: [userA, userB] });
    return newConv.id;
  }
}
