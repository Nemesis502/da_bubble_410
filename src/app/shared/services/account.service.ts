import { Injectable, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.services';
import { Router } from '@angular/router';
import { SessionService } from './currentUserSession.service';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private auth = inject(AuthService);
  private users = inject(UserService);
  private router = inject(Router);
  private currentUserSession = inject(SessionService)

  async logoutAndMarkOffline(userId?: string) {
    if (userId === 'Guest') {
     this.currentUserSession.setBehaviorNull();
      this.router.navigate(['/']);
      // window.location.replace("/");
    } else {
      try {
        await this.auth.logout();
        if (userId) {
          await this.users.updateUserStatusFalse(userId);
        }
      } finally {
        this.currentUserSession.setBehaviorNull();
        this.router.navigate(['/']);
        // window.location.replace("/")
      }
    }
  }
}
