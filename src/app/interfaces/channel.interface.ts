import { Message } from "./message.interface";

export interface Channel {
    channelId?: string;
    name: string;
    description: string;
    createdBy: string;
    members: string[];
    messages?: Message[];
}
