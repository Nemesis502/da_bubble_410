import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ChatService } from './chat.service';
import { ChatUIService } from './chat-ui.service';
import { SessionService } from './currentUserSession.service';
import {
  ChannelsDirectMessageService,
  DirectMessage,
} from './channels-direct-message.service';
import { appUser } from '../../interfaces/user.interface';
import { Channel } from '../../interfaces/channel.interface';
@Injectable({ providedIn: 'root' })
export class ChatGuestService {
  private chatService = inject(ChatService);
  private chatUIService = inject(ChatUIService);
  private channelDirectMessageData = inject(ChannelsDirectMessageService);
  private userSession = inject(SessionService);

  /** Current guest chat state */
  isGuestChat: boolean = false;
  otherUser: appUser | null = null;
  selectedChannel: Channel | null = null;
  messages: any[] = [];
  messages$: Observable<any[]> = of([]);

  /** Subscribe to guest direct messages */
  subscribeToGuestDirectMessages(): void {
    this.channelDirectMessageData.selectedGuestDirectMessage$.subscribe(
      (guestUser: DirectMessage | null) => {
        if (!guestUser) return;
        this.setGuestChatState(guestUser);
        this.chatUIService.scrollToBottom();
      }
    );
  }

  /** Subscribe to guest channels */ subscribeToGuestChannels(): void {
    this.channelDirectMessageData.selectedGuestChannel$.subscribe(
      async (channel) => {
        if (!channel?.channelId) return;
        await this.setGuestChannelState(channel);
        this.chatUIService.scrollToBottom();
      }
    );
  }

  /** Sets guest chat state for a direct message */ private setGuestChatState(
    guestUser: DirectMessage
  ): void {
    this.isGuestChat = true;
    this.selectedChannel = null;
    this.messages$ = of([]);
    this.messages = [];
    this.otherUser = this.mapGuestUser(guestUser);
  }

  /** Maps a DirectMessage to appUser */ private mapGuestUser(
    guestUser: DirectMessage
  ): appUser {
    return {
      id: guestUser.id,
      userName: guestUser.name,
      profilePic: parseInt(guestUser.img.replace('.png', ''), 10),
      status: guestUser.status === 'online',
      email: guestUser.name.replace(/\s+/g, '.').toLowerCase() + '@guest.local',
    } as appUser;
  }
  
  /** Sets guest channel state and initializes chat */ async setGuestChannelState(
    channel: Channel
  ): Promise<void> {
    this.otherUser = null;
    this.selectedChannel = channel;
    this.isGuestChat = true;
    if (!channel?.channelId) return;
    const currentUser = this.userSession.getCurrentUser();
    await this.chatService.initializeChat(channel.channelId, currentUser?.id);
    this.messages$ = this.chatService.messages$;
  }
}
