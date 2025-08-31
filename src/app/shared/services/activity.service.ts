import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const INACTIVITY_MS = 100 * 60 * 1000; // 20 minutes
const LS_KEY = 'lastActivityAt';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private timeoutId: any = null;

  private _inactivity$ = new BehaviorSubject<boolean>(false);
  readonly inactivity$ = this._inactivity$.asObservable();

  constructor(
    private ngZone: NgZone,
  ) { }

  // Initializes the activity tracking:
  // - Sets initial last activity timestamp if not present
  // - Adds event listeners for user interactions
  // - Schedules inactivity check
  init() {
    if (!localStorage.getItem(LS_KEY)) {
      localStorage.setItem(LS_KEY, Date.now().toString());
    }
    ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']
      .forEach(evt => window.addEventListener(evt, this.markActivity, { passive: true }));
    document.addEventListener('visibilitychange', this.handleVisibility, false);
    this.scheduleCheck();
  }

  // Cleans up event listeners and timers
  destroy() {
    ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']
      .forEach(evt => window.removeEventListener(evt, this.markActivity as any));
    document.removeEventListener('visibilitychange', this.handleVisibility as any);
    this.clearTimer();
  }

  // Marks activity when navigating to a new route
  bumpOnNavigation() { this.markActivity(); }

  // Checks if inactivity period has expired
  isExpired(): boolean {
    const last = Number(localStorage.getItem(LS_KEY) || '0');
    return Date.now() - last >= INACTIVITY_MS;
  }

  // Updates last activity timestamp and reschedules inactivity check
  private markActivity = () => {
    localStorage.setItem(LS_KEY, Date.now().toString());
    this.scheduleCheck();
  };

  // Handles browser tab visibility changes
  private handleVisibility = () => {
    if (document.visibilityState === 'visible') this.checkNow();
  };

  // Clears the currently scheduled inactivity timer
  private clearTimer() {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }

  // Schedules the next inactivity check based on remaining time
  private scheduleCheck() {
    this.clearTimer();
    const last = Number(localStorage.getItem(LS_KEY) || '0');
    const remaining = Math.max(0, last + INACTIVITY_MS - Date.now());
    this.ngZone.runOutsideAngular(() => {
      this.timeoutId = setTimeout(() => this.ngZone.run(() => this.checkNow()), remaining);
    });
  }

  // Checks immediately if inactivity expired, triggers warning if so
  private async checkNow() {
    if (!this.isExpired()) { this.scheduleCheck(); return; }
    this.askStillThere();
  }

  // Emits inactivity event and sets auto-logout flag
  askStillThere() {
    this._inactivity$.next(true);
    localStorage.setItem('autoLoggedOut', '1');
  }

  // Resets inactivity event
  resetFlag() {
    this._inactivity$.next(false);
  }
}
