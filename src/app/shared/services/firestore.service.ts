import { inject, Injectable } from '@angular/core';
import { collection, collectionData, docData, Firestore } from '@angular/fire/firestore';
import { addDoc, doc, onSnapshot } from 'firebase/firestore';
import { Observable } from 'rxjs';
import { Channel } from '../../interfaces/channel.interface';

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  private firestore = inject(Firestore);

  getUserById(uid: string) {
    const userDoc = doc(this.firestore, 'users', uid);
    console.log('userDoc:', userDoc);
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

  addChannel(channel: Channel) {
    const ref = collection(this.firestore, 'channels');
    return addDoc(ref, channel);
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