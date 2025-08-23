import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { appUser } from "../../interfaces/user.interface";

@Injectable({ providedIn: 'root' })
export class SessionService {
    currentUser: appUser | null = null;
    private currentLogingUser = new BehaviorSubject<appUser | null>(null);
    currentLogingUser$ = this.currentLogingUser.asObservable();

    setCurrentUser(currentUser: appUser) {
        this.currentLogingUser.next(currentUser);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }

    getCurrentUser(): appUser | null {
        const local = localStorage.getItem('currentUser');
        if (local && !this.currentLogingUser.value) {
            this.currentLogingUser.next(JSON.parse(local));
        }
        return this.currentLogingUser.value;
    }

    setBehaviorNull() {
        this.currentLogingUser.next(null);
        localStorage.removeItem('currentUser');
    }
}