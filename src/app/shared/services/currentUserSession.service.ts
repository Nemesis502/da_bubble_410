import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { appUser } from "../../interfaces/user.interface";

@Injectable({ providedIn: 'root' })
export class SessionService {
    private currentLogingUser = new BehaviorSubject<appUser | null>(null);
    currentLogingUser$ = this.currentLogingUser.asObservable();

    setCurrentUser(currentUser: appUser) {
        if (currentUser.id == 'Guest') {
            this.currentLogingUser.next(currentUser);
        } else {
            this.currentLogingUser.next(currentUser);
        }
    }

    getCurrentUser(): appUser | null {
        return this.currentLogingUser.value;
    }
}