import { EventEmitter, Injectable, Output } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';

export interface MessagePayload {
  senderID: string;
  text: string;
  channelId?: string;
}

@Injectable({ providedIn: 'root' })
export class NewMessageSendingService {
  @Output() chatSelected = new EventEmitter<string>();
  @Output() chatTypeSelected = new EventEmitter<'channel' | 'conversation'>();
  @Output() closeNewMessage = new EventEmitter<void>();

  constructor(private firestore: Firestore, private router: Router) {}

  /** Send a direct message to a user, creating a conversation if needed */
async sendDirectMessage(
  senderId: string,
  recipientId: string,
  text: string,
  navigate: boolean = true
): Promise<string> {
  const conversationId = await this.getOrCreateConversation(senderId, recipientId);
  await this.addMessageToFirestore(
    `conversations/${conversationId}/directMessages`,
    {
      senderID: senderId,
      text,
    }
  );

  if (navigate) {
    if (window.innerWidth < 800) {
      this.router.navigate([`/chat-container/conversation/${conversationId}`]);
    } else {
      this.chatSelected.emit(conversationId);
      this.chatTypeSelected.emit('conversation');
      this.closeNewMessage.emit();
    }
  }

  return conversationId;
}


  /** Send a message to a channel */
  async sendChannelMessage(
    senderId: string,
    channelId: string,
    text: string
  ): Promise<void> {
    await this.addMessageToFirestore(`channels/${channelId}/messages`, {
      senderID: senderId,
      channelId,
      text,
    });

      if (window.innerWidth < 800) {
      this.router.navigate([`/chat-container/channel/${channelId}`]);
    } else {
      this.chatSelected.emit(channelId);
      this.chatTypeSelected.emit('channel');
      this.closeNewMessage.emit();
    }
  }

  /** Add a message to a Firestore collection with timestamp */
  private async addMessageToFirestore(
    collectionPath: string,
    message: any
  ): Promise<void> {
    const msgCol = collection(this.firestore, collectionPath);
    await addDoc(msgCol, { ...message, timestamp: new Date() });
  }

  /** Get existing conversation between two users or create a new one */
  private async getOrCreateConversation(
    userA: string,
    userB: string
  ): Promise<string> {
    const convRef = collection(this.firestore, 'conversations');
    const q = query(convRef, where('participants', 'array-contains', userA));
    const snapshot = await getDocs(q);

    const existing = snapshot.docs.find((doc) => {
      const participants = doc.data()['participants'] as string[];
      return participants.includes(userB);
    });

    if (existing) return existing.id;

    const newConv = await addDoc(convRef, { participants: [userA, userB] });
    return newConv.id;
  }

    selectChat(chatId: string, type: 'channel' | 'conversation') {
    this.chatTypeSelected.next(type);
    this.chatSelected.next(chatId);
  }
}
