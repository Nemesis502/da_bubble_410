import { Component, inject, OnDestroy, } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ActivityService } from './shared/services/activity.service';
import { AsyncPipe } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { SessionService } from './shared/services/currentUserSession.service';
import { AccountService } from './shared/services/account.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',

})
export class AppComponent implements OnDestroy {
  private activity = inject(ActivityService);
  private session = inject(SessionService);
  private account = inject(AccountService);

  showAutoLogoutInfo = false;

  constructor() {
    this.activity.init();
    this.activity.inactivity$
      .pipe(takeUntilDestroyed())
      .subscribe(async (inactive) => {
        if (!inactive) return;

        const uid = this.session.getCurrentUser()?.id;
        await this.account.logoutAndMarkOffline(uid);
        this.showAutoLogoutInfo = true;
      });

    window.addEventListener('storage', (e) => {
      this.checkStorage(e)
    });

    if (localStorage.getItem('autoLoggedOut') === '1') {
      this.showAutoLogoutInfo = true;
    }
  }

  checkStorage(e: StorageEvent) {
    if (e.key === 'autoLoggedOut' && e.newValue === '1') {
      this.showAutoLogoutInfo = true;
    }
  }

  confirmAutoLogOut() {
    this.showAutoLogoutInfo = false;
    localStorage.setItem('autoLoggedOut', '0');
  }

  ngOnDestroy() {
    this.activity.destroy();
  }
}
