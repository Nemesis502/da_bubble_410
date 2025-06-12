import { Message } from "./message.interface";

export interface Channel {
    ChannelId?: string;
    name: string;
    description: string;
    createdAt: Date; // was glaubt ihr, brauchen wir das auch?
    createdBy: string;
    isPublic: boolean; // was glaubt ihr, brauchen wir das auch?
    members: string[];
    messages?: Message[];
}
