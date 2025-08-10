import { Injectable, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.services';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private auth = inject(AuthService);
  private users = inject(UserService);
  private router = inject(Router);

  /**
   * Loggt aus, setzt den User-Status in Firestore auf false
   * und navigiert zurück zur Startseite.
   */
  async logoutAndMarkOffline(userId?: string) {
    try {
      await this.auth.logout();
      if (userId) {
        await this.users.updateUserStatusFalse(userId);
      }
    } finally {
      this.router.navigate(['/']);
    }
  }
}
