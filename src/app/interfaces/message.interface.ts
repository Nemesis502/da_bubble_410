import { Reactions } from "./reactions.interface";
import { Thread } from "./thread.interface";

export interface Message {
    messageId?: string;
    text: string;
    timestamp: Date;
    senderId: string;
    channelId?: string;
    reactions?: Reactions[];
    thread?: Thread[];
}
