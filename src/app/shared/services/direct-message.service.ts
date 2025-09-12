import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { appUser } from '../../interfaces/user.interface';
import { FirestoreService } from './firestore.service';

@Injectable({ providedIn: 'root' })
export class DirectMessageService {
  private directMessages: any[] = [];
  private currentUser: appUser | null = null;

  constructor(
    private router: Router,
    private firestoreService: FirestoreService
  ) {}

  setCurrentUser(user: appUser) {
    this.currentUser = user;
    this.loadUserConversations(user.id!);
  }

  private loadUserConversations(userId: string) {
    this.firestoreService
      .getConversationsByUserId(userId)
      .subscribe((convs) => {
        this.directMessages = convs;
      });
  }

async findAndOpenConversation(
  loggedUserId: string,
  targetUserId: string,
  opts?: { onConversationOpened?: (conversationId: string) => void }
): Promise<void> {
  if (!loggedUserId || !targetUserId) {
    throw new Error('User IDs are required');
  }

  const conversation = await this.getOrCreateConversation(loggedUserId, targetUserId);

  if (conversation?.id) {
    this.handleConversationOpen(conversation.id, opts);
  }
}

/** Finds existing conversation or creates a new one */
private async getOrCreateConversation(
  userAId: string,
  userBId: string
): Promise<any | null> {
  let conversation = await this.firestoreService.getConversationBetweenUsers(userAId, userBId);

  if (!conversation) {
    conversation = await this.createNewConversation(userAId, userBId);
  }

  return conversation;
}

/** Creates a new conversation between two users */
private async createNewConversation(userAId: string, userBId: string): Promise<any> {
  const participantIds = [userAId, userBId];
  const participantIdsSorted = [...participantIds].sort().join('_');

  const newConv = {
    participants: participantIds,
    participantIdsSorted,
    createdAt: new Date(),
  };

  const created = await this.firestoreService.createConversationAndReturnId(newConv);
  return { id: created.id, ...newConv };
}

/** Handles routing or notifying parent depending on screen size */
private handleConversationOpen(
  conversationId: string,
  opts?: { onConversationOpened?: (conversationId: string) => void }
): void {
  if (window.innerWidth < 1300) {
    this.router.navigate(['/chat-container/conversation', conversationId]);
  } else {
    opts?.onConversationOpened?.(conversationId);
  }
}


  async ensureSelfConversationExists(): Promise<void> {
    if (!this.currentUser) return;

    const userId = this.currentUser.id!;
    const existingConversation =
      await this.firestoreService.getSelfConversation(userId);

    if (!existingConversation) {
      const newConversation = {
        participants: [userId, userId],
        participantIdsSorted: `${userId}_${userId}`,
        createdAt: new Date(),
        isPrivateNote: true,
      };
      await this.firestoreService.createConversation(newConversation);
    }
  }
}
