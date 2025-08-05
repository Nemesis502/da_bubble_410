import { Timestamp } from "firebase/firestore";

export interface Reactions {
    reactionID?: string;
    reactorID: string;
    timestamp: Timestamp;
    type: string;
}