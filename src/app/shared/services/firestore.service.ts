import { inject, Injectable } from '@angular/core';
import { collection, collectionData, docData, Firestore, addDoc, doc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Channel } from '../../interfaces/channel.interface';

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  private firestore = inject(Firestore);

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

  addChannel(channel: Channel) {
    const ref = collection(this.firestore, 'channels');
    return addDoc(ref, channel);
  }
}