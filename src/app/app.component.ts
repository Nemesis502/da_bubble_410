import { Component, inject, OnDestroy, } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ActivityService } from './shared/services/activity.service';
import { AsyncPipe } from '@angular/common';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AsyncPipe, ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',

})
export class AppComponent implements OnDestroy {
  private router = inject(Router);
  activity = inject(ActivityService);

  private sub = this.router.events
    .pipe(filter(e => e instanceof NavigationEnd))
    .subscribe(() => this.activity.bumpOnNavigation());

  constructor(private auth: Auth) { this.activity.init(); }

  confirmAutoLogOut() {
    // z.B. Dialog schließen / Banner verstecken
    this.activity.resetFlag();
    // Optional: wirklich ausloggen + redirect:
    // this.auth.signOut().then(() => this.router.navigate(['/']));
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    this.activity.destroy();
  }
}
