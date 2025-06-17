import { Message } from "./message.interface";

export interface Channel {
    ChannelId?: string;
    name: string;
    description: string;
    createdBy: string;
    members: string[];
    messages?: Message[];
}
