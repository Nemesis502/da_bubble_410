import { inject, Injectable } from "@angular/core";
import { addDoc, collection, Firestore, onSnapshot } from "@angular/fire/firestore";
import { User } from "../interfaces/user.interface";

@Injectable({
    providedIn: 'root'
})
export class UserService {
    firestore: Firestore = inject(Firestore);
    allUsers: User[] = [];
    unsubUsers;

    constructor() {
        this.unsubUsers = this.subUserList();
    }

    ngOnDestroy() {
        this.unsubUsers();
    }

    subUserList() {
        return onSnapshot(this.getUserRef(), (list: any) => {
            this.allUsers = [];
            list.forEach((element: { id: string; data: () => any; }) => {
                console.log(element.id);
                this.allUsers.push(this.setUserObject(element.data(), element.id));
            })
        })
    }

    async addUser(item: User) {
        await addDoc(this.getUserRef(), item).catch(
            (err: any) => { console.error(err) }
        ).then(
            (docRef: any) => { console.log("Document written with ID: ", docRef?.id) }
        )
    }

    getUserRef() {
        return collection(this.firestore, 'users');
    }

    setUserObject(obj: any, id: string): User {
        return {
            id: id || "",
            userName: obj.userName || "",
            profilePic: obj.imgId || 0,
            status: obj.status || false,
            email: obj.email || "",
        }
    }
}