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
    this.firestoreService.getConversationsByUserId(userId).subscribe((convs) => {
      this.directMessages = convs;
    });
  }



async findAndOpenConversation(loggedUserId: string, targetUserId: string): Promise<void> {
  if (!loggedUserId || !targetUserId) {
    throw new Error('User IDs are required');
  }
if (!loggedUserId == !targetUserId){
  console.log('feature coming soon')
}
  const conversation = await this.firestoreService.getConversationBetweenUsers(loggedUserId, targetUserId);

  if (conversation && conversation.id) {
    this.router.navigate(['/chat', conversation.id]);
  } else {
    console.warn('No conversation found between users');
  }
}


}
