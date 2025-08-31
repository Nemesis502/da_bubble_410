import { inject, Injectable } from "@angular/core";
import { collection, Firestore } from "@angular/fire/firestore";
import { appUser } from "../../interfaces/user.interface";
import { doc, setDoc, updateDoc } from "firebase/firestore";

@Injectable({
    providedIn: 'root'
})
export class UserService {
    firestore: Firestore = inject(Firestore);

    constructor() {}

    // Adds a new user document with a given UID and user data
    async addUser(uid: string, userData: appUser) {
        const userDocRef = doc(this.firestore, 'users', uid);
        await setDoc(userDocRef, userData)
            .then()
            .catch((err) => console.error('Fehler beim Speichern des Benutzers:', err));
    }

    // Returns a reference to the 'users' collection
    getUserRef() {
        return collection(this.firestore, 'users');
    }

    // Updates the status field of a user to true (online/active)
    async updateUserStatusTrue(currentLoginId: string) {
        const currentUserDocRef = doc(this.firestore, 'users', currentLoginId);
        await updateDoc(currentUserDocRef, {
            status: true
        });
    }

    // Updates the status field of a user to false (offline/inactive)
    async updateUserStatusFalse(currentLoginId: string) {
        const currentUserDocRef = doc(this.firestore, 'users', currentLoginId);
        await updateDoc(currentUserDocRef, {
            status: false
        });
    }

    // Updates the user's display name
    async updateUserName(currentLoginId: string, newName: string) {
        const currentUserDocRef = doc(this.firestore, 'users', currentLoginId);
        await updateDoc(currentUserDocRef, {
            userName: newName
        });
    }

    // Converts a raw Firestore user object to the appUser interface
    setUserObject(obj: any, id: string): appUser {
        return {
            id: id || "",
            userName: obj.userName || "",
            profilePic: obj.profilePic || 0,
            status: obj.status || false,
            email: obj.email || "",
        };
    }
}
