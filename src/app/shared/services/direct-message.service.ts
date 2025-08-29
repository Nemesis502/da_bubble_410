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
    targetUserId: string
  ): Promise<void> {
    if (!loggedUserId || !targetUserId) {
      throw new Error('User IDs are required');
    }
    const conversation =
      await this.firestoreService.getConversationBetweenUsers(
        loggedUserId,
        targetUserId
      );

    if (conversation && conversation.id) {
      this.router.navigate(['/chat', conversation.id]);
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
