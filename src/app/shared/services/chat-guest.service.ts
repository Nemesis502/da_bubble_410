import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ChannelsDirectMessageService, DirectMessage } from '../../shared/services/channels-direct-message.service';
import { appUser } from '../../interfaces/user.interface';
import { Channel } from '../../interfaces/channel.interface';

@Injectable({
  providedIn: 'root'
})
export class ChatGuestService {

  constructor(private channelDirectMessageData: ChannelsDirectMessageService) {}

  /** Handles guest direct messages */
  subscribeToGuestDirectMessages(
    callback: (user: appUser, isConversation: boolean) => void
  ) {
    this.channelDirectMessageData.selectedGuestDirectMessage$.subscribe(
      (guestUser: DirectMessage | null) => {
        if (!guestUser) return;
        callback(this.mapGuestUser(guestUser), true);
      }
    );
  }

  /** Handles guest channels */
  subscribeToGuestChannels(
    callback: (channel: Channel) => void
  ) {
    this.channelDirectMessageData.selectedGuestChannel$.subscribe(
      async (channel) => {
        if (!channel?.channelId) return;
        callback(channel);
      }
    );
  }

  /** Maps a guest direct message to an appUser */
  mapGuestUser(guestUser: DirectMessage): appUser {
    return {
      id: guestUser.id,
      userName: guestUser.name,
      profilePic: parseInt(guestUser.img.replace('.png', ''), 10),
      status: guestUser.status === 'online',
      email: guestUser.name.replace(/\s+/g, '.').toLowerCase() + '@guest.local',
    };
  }

  /** Maps channel members */
  mapChannelMembers(channel: Channel): any[] {
    return (
      channel.members?.map((id, i) => ({
        id,
        userName: id,
        profilePic: i + 1,
        status: true,
      })) || []
    );
  }
}
