import { inject, Injectable } from '@angular/core';
import { collection, collectionData, docData, Firestore } from '@angular/fire/firestore';
import { addDoc, doc, getDoc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { Observable } from 'rxjs';
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
}