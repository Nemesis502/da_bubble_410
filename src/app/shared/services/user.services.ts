import { inject, Injectable } from "@angular/core";
import { collection, Firestore, onSnapshot } from "@angular/fire/firestore";
import { appUser } from "../../interfaces/user.interface";
import { doc, setDoc, updateDoc } from "firebase/firestore";

@Injectable({
    providedIn: 'root'
})
export class UserService {
    firestore: Firestore = inject(Firestore);

    constructor() {
    }

    async addUser(uid: string, userData: appUser) {
        const userDocRef = doc(this.firestore, 'users', uid);
        await setDoc(userDocRef, userData)
            .then(() => console.log('Benutzer erfolgreich mit UID als ID gespeichert'))
            .catch((err) => console.error('Fehler beim Speichern des Benutzers:', err));
    }

    getUserRef() {
        return collection(this.firestore, 'users');
    }

    async updateUserStatusTrue(currentLoginId: string) {
        const currentUserDocRef = doc(this.firestore, 'users', currentLoginId);
        await updateDoc(currentUserDocRef, {
            status: true
        })
    }

    async updateUserStatusFalse(currentLoginId: string) {
        const currentUserDocRef = doc(this.firestore, 'users', currentLoginId);
        await updateDoc(currentUserDocRef, {
            status: false
        })
    }

    async updateUserName(currentLoginId: string, newName: string) {
        const currentUserDocRef = doc(this.firestore, 'users', currentLoginId);
        await updateDoc(currentUserDocRef, {
            userName: newName
        })
    }

    setUserObject(obj: any, id: string): appUser {
        return {
            id: id || "",
            userName: obj.userName || "",
            profilePic: obj.profilePic || 0,
            status: obj.status || false,
            email: obj.email || "",
        }
    }
}