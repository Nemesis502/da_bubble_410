import { DirectMessage } from "../shared/services/channels-direct-message.service";
import { Channel } from "./channel.interface";
import { appUser } from "./user.interface";

export interface SearchResults {
    channels: Channel[];
    directMessages: appUser[] | DirectMessage[];
    contentResults: Array<{ channel: Channel; hits: { id: string; text: string; timestamp: any }[] }>;
    directMessageResults: Array<{ conversationId: string; user: appUser; hits: { id: string; text: string; timestamp: any }[] }>;
}