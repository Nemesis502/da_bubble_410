import { inject, Injectable } from '@angular/core';
import { ChannelsDirectMessageService } from './channels-direct-message.service';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { appUser } from '../../interfaces/user.interface';

@Injectable({
  providedIn: 'root',
})
export class ChatLoadingService {
  // Firestore instance for database operations
  private firestore = inject(Firestore);

  // Service for managing channels and direct messages
  private channelService = inject(ChannelsDirectMessageService);

  /**
   * Loads messages for a conversation and updates the provided BehaviorSubject.
   * @param conversationId The ID of the conversation to load messages for.
   * @param messages$ BehaviorSubject to push the loaded messages into.
   */
  loadMessagesForConversation(conversationId: string, messages$: any) {
    this.channelService
      .getEnrichedConversationMessages(conversationId)
      .subscribe((messages) => messages$.next(messages));
  }

  /**
   * Loads messages for a channel and merges them with pending messages in the current state.
   * @param channel The channel object containing the channelId.
   * @param messages$ BehaviorSubject to push the loaded messages into.
   */
  loadMessagesForChannel(channel: any, messages$: any) {
    if (!channel?.channelId) return; 
    this.channelService.getEnrichedMessages(channel.channelId).subscribe((messages) => {
      const current = messages$.getValue();
      const filtered = current.filter((m: any) => m.pending);
      messages$.next([...filtered, ...messages]);
    });
  }

  /**
   * Fetches profile information for another user and updates the provided BehaviorSubject.
   * @param userId The ID of the other user to fetch.
   * @param otherUser$ BehaviorSubject to push the user info into.
   */
  async fetchOtherUserInfo(userId: string, otherUser$: any) {
    try {
      const data = await this.getUserData(userId); 
      otherUser$.next(data ? this.mapUserData(userId, data) : null);
    } catch {
      otherUser$.next(null); 
    }
  }

  /**
   * Retrieves Firestore user document data by userId.
   * @param userId The ID of the user.
   * @returns The user data if exists, otherwise null.
   */
  private async getUserData(userId: string): Promise<any | null> {
    const userDocRef = doc(this.firestore, `users/${userId}`);
    const userSnap = await getDoc(userDocRef);
    return userSnap.exists() ? userSnap.data() : null;
  }

  /**
   * Maps raw Firestore user data to the appUser interface structure.
   * @param userId The ID of the user.
   * @param data Raw Firestore user data.
   * @returns Mapped appUser object.
   */
  private mapUserData(userId: string, data: any): appUser {
    return {
      id: userId,
      userName: data?.['userName'] || 'Unknown', 
      profilePic: data?.['profilePic'],         
      status: data?.['status'] ?? false,         
      email: data?.['email'] || '',              
    };
  }

  /**
   * Resolves a channel by its ID, either from cached known channels or from Firestore.
   * @param channelId The ID of the channel to resolve.
   * @returns The channel object if found, otherwise null.
   */
  async resolveChannelById(channelId: string) {
    const knownChannels = this.channelService.getChannels();
    const matchedChannel = knownChannels.find((c) => c.channelId === channelId);
    if (matchedChannel) return matchedChannel;
    return await this.channelService.getChannelById(channelId);
  }
}
