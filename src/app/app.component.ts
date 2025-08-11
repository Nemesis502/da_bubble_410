import { Component, inject, OnDestroy, } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ActivityService } from './shared/services/activity.service';
import { AsyncPipe } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { SessionService } from './shared/services/currentUserSession.service';
import { AccountService } from './shared/services/account.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AsyncPipe,],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',

})
export class AppComponent implements OnDestroy {
  private router = inject(Router);
  activity = inject(ActivityService);

  private sub = this.router.events
    .pipe(filter(e => e instanceof NavigationEnd))
    .subscribe(() => this.activity.bumpOnNavigation());

  constructor(private auth: Auth, private session: SessionService, private account: AccountService) { this.activity.init(); }

  confirmAutoLogOut() {
    this.activity.resetFlag();
    let uid = this.session.getCurrentUser()?.id
    console.log(uid);
    this.account.logoutAndMarkOffline(uid);
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    this.activity.destroy();
  }
}
