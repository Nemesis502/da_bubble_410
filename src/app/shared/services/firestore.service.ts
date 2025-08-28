import { inject, Injectable } from '@angular/core';
import { collection, collectionData, docData, Firestore } from '@angular/fire/firestore';
import { addDoc, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { map, Observable } from 'rxjs';
import { Channel } from '../../interfaces/channel.interface';

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  private firestore = inject(Firestore);

  async addMembersToChannel(channelId: string, newMemberIds: string[]): Promise<void> {
    const channelRef = this.getChannelDocRef(channelId);
    const channelSnap = await getDoc(channelRef);
    const channelData = channelSnap.data();

    if (!channelData) throw new Error('Channel nicht gefunden');

    const existingMembers: string[] = channelData['members'] || [];
    const updatedMembers = Array.from(new Set([...existingMembers, ...newMemberIds]));

    await updateDoc(channelRef, { members: updatedMembers });
  }

  getUserById(uid: string) {
    const userDoc = doc(this.firestore, 'users', uid);
    return docData(userDoc, { idField: 'id' });
  }

  getChannels(): Observable<any[]> {
    const ref = collection(this.firestore, 'channels');
    return collectionData(ref, { idField: 'id' });
  }

  getUsers(): Observable<any[]> {
    const ref = collection(this.firestore, 'users');
    return collectionData(ref, { idField: 'id' });
  }

  getConversations(): Observable<any[]> {
    const ref = collection(this.firestore, 'conversations');
    return collectionData(ref, { idField: 'id' });
  }

  getConversationsByUserId(userId: string): Observable<any[]> {
    const ref = collection(this.firestore, 'conversations');
    const q = query(ref, where('participants', 'array-contains', userId));
    return collectionData(q, { idField: 'id' });
  }

  async getConversationBetweenUsers(userAId: string, userBId: string): Promise<any | null> {
    const ref = collection(this.firestore, 'conversations');
    const q = query(ref, where('participants', 'array-contains', userAId));
    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (data['participants'].includes(userBId)) {
        return { id: docSnap.id, ...data };
      }
    }

    return null;
  }

  getSelfConversation(userId: string): Promise<any | null> {
    const participantKey = `${userId}_${userId}`;
    const conversationsRef = collection(this.firestore, 'conversations');
    const q = query(
      conversationsRef,
      where('isPrivateNote', '==', true),
      where('participantIdsSorted', '==', participantKey),
      limit(1)
    );

    return getDocs(q).then(snapshot => {
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
      return null;
    });
  }

  async createConversation(conversation: any): Promise<void> {
    const conversationsRef = collection(this.firestore, 'conversations');
    await addDoc(conversationsRef, conversation);
  }

  addChannel(channel: Omit<Channel, 'channelId'>) {
    const channelCollection = collection(this.firestore, 'channels');
    return addDoc(channelCollection, channel);
  }

  updateChannel(id: string, updateData: Partial<Channel>) {
    const channelDoc = doc(this.firestore, 'channels', id);
    return updateDoc(channelDoc, updateData);
  }

  synFirebase(uid: string) {
    return onSnapshot(doc(this.firestore, 'users', uid), (doc) => {
      console.log('current Data:', doc.data);
    })
  }

  getUserDocRef(uid: string) {
    return doc(this.firestore, 'users', uid);
  }

  getChannelDocRef(channelId: string) {
    return doc(this.firestore, 'channels', channelId);
  }

  getChannelMembers(channelId: string): Observable<any[]> {
    const channelRef = this.getChannelDocRef(channelId);
    return docData(channelRef).pipe(
      map(channelData => channelData?.['members'] || [])
    );
  }
  getUsersByIds(userIds: string[]): Observable<any[]> {
    const userRefs = userIds.map(uid => doc(this.firestore, 'users', uid));
    return collectionData(collection(this.firestore, 'users'), { idField: 'id' }).pipe(
      map(users => users.filter(user => userIds.includes(user.id)))
    );
  }
  async deleteGuestChannels(): Promise<void> {
    const channelsRef = collection(this.firestore, 'channels');
    const q = query(channelsRef, where('createdBy', '==', 'Guest'));
    const snapshot = await getDocs(q);

    const deletePromises = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));

    await Promise.all(deletePromises);
  }

  async deleteGuestConversations(): Promise<void> {
    const conversationsRef = collection(this.firestore, 'conversations');
    const q = query(conversationsRef, where('participants', 'array-contains', 'Guest'));
    const snapshot = await getDocs(q);

    const deletePromises = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));

    await Promise.all(deletePromises);
  }

  /** Deletes all messages sent by "Guest" under all channels */
  async deleteGuestMessages(): Promise<void> {
    const channelsRef = collection(this.firestore, 'channels');
    const channelsSnap = await getDocs(channelsRef);

    let totalDeleted = 0;

    for (const channelDoc of channelsSnap.docs) {
      const messagesRef = collection(this.firestore, `channels/${channelDoc.id}/messages`);
      const messagesSnap = await getDocs(messagesRef);

      const guestMessages = messagesSnap.docs.filter(msgDoc => msgDoc.data()['senderID'] === 'Guest');

      const deletePromises = guestMessages.map(msgDoc => deleteDoc(msgDoc.ref));

      await Promise.all(deletePromises);

      totalDeleted += deletePromises.length;
    }
  }

  // Letzte N Nachrichten eines Channels (nur Text & Timestamp, reicht hier)
  getRecentMessagesForChannel(channelId: string, limitN = 200) {
    const col = collection(this.firestore, `channels/${channelId}/messages`);
    const q = query(col, orderBy('timestamp', 'desc'), limit(limitN));

    return collectionData(q, { idField: 'id' }) as Observable<
      Array<{ id: string; text?: string; timestamp: any }>
    >;
  }

  // Channels des Users (du hast bereits getChannels(); hier filtern wir clientseitig)
  getMemberChannels(userId: string): Observable<Channel[]> {
    return this.getChannels().pipe(
      map(chs => chs.filter(c => Array.isArray(c.members) && c.members.includes(userId)))
    );
  }
}