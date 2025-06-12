import { Reactions } from "./reactions.interface";

export interface Thread {
    text: string;
    threadMessageID: string;
    threadSenderID: string;
    timestamp: Date;
    reactions?: Reactions[];
}
