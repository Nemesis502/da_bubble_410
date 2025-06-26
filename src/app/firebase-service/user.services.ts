import { inject, Injectable } from "@angular/core";
import { addDoc, collection, Firestore, onSnapshot } from "@angular/fire/firestore";
import { appUser } from "../interfaces/user.interface";
import { doc, setDoc, updateDoc } from "firebase/firestore";

@Injectable({
    providedIn: 'root'
})
export class UserService {
    firestore: Firestore = inject(Firestore);
    // allUsers: User[] = [];
    // unsubUsers;

    constructor() {
        // this.unsubUsers = this.subUserList();
    }

    // ngOnDestroy() {
    //     this.unsubUsers();
    // }

    // subUserList() {
    //     return onSnapshot(this.getUserRef(), (list: any) => {
    //         this.allUsers = [];
    //         list.forEach((element: { id: string; data: () => any; }) => {
    //             console.log(element.id);
    //             this.allUsers.push(this.setUserObject(element.data(), element.id));
    //         })
    //     })
    // }

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