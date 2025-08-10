// inactivity.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, CanMatch, Router, UrlTree } from '@angular/router';
import { ActivityService } from './activity.service';
import { Auth } from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class InactivityGuard implements CanActivate, CanMatch {
  constructor(
    private activity: ActivityService,
    private router: Router,
    private auth: Auth
  ) {}

  async canActivate(): Promise<boolean | UrlTree> {
    return this.evaluate();
  }

  async canMatch(): Promise<boolean | UrlTree> {
    return this.evaluate();
  }

  private async evaluate(): Promise<boolean | UrlTree> {
    if (this.activity.isExpired()) {
      try { await this.auth.signOut(); } catch {}
      return this.router.parseUrl('/'); // zurück zum Login
    }
    // Zählt als Aktivität
    this.activity.bumpOnNavigation();
    return true;
  }
}
