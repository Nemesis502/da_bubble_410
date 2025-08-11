// activity.service.ts
import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const INACTIVITY_MS = 100 * 60 * 1000; // 20 Minuten
const LS_KEY = 'lastActivityAt';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private timeoutId: any = null;


  private _inactivity$ = new BehaviorSubject<boolean>(false);
  readonly inactivity$ = this._inactivity$.asObservable();

  constructor(
    private ngZone: NgZone,
  ) { }

  init() {
    if (!localStorage.getItem(LS_KEY)) {
      localStorage.setItem(LS_KEY, Date.now().toString());
    }
    ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']
      .forEach(evt => window.addEventListener(evt, this.markActivity, { passive: true }));
    document.addEventListener('visibilitychange', this.handleVisibility, false);
    this.scheduleCheck();
  }

  destroy() {
    ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']
      .forEach(evt => window.removeEventListener(evt, this.markActivity as any));
    document.removeEventListener('visibilitychange', this.handleVisibility as any);
    this.clearTimer();
  }

  bumpOnNavigation() { this.markActivity(); }

  isExpired(): boolean {
    const last = Number(localStorage.getItem(LS_KEY) || '0');
    return Date.now() - last >= INACTIVITY_MS;
  }

  private markActivity = () => {
    localStorage.setItem(LS_KEY, Date.now().toString());
    this.scheduleCheck();
  };

  private handleVisibility = () => {
    if (document.visibilityState === 'visible') this.checkNow();
  };

  private clearTimer() {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }

  private scheduleCheck() {
    this.clearTimer();
    const last = Number(localStorage.getItem(LS_KEY) || '0');
    const remaining = Math.max(0, last + INACTIVITY_MS - Date.now());
    this.ngZone.runOutsideAngular(() => {
      this.timeoutId = setTimeout(() => this.ngZone.run(() => this.checkNow()), remaining);
    });
  }

  private async checkNow() {
    if (!this.isExpired()) { this.scheduleCheck(); return; }
    this.askStillThere();
  }

  askStillThere() {
    this._inactivity$.next(true);
  }

  resetFlag() {
    this._inactivity$.next(false);
  }
}
