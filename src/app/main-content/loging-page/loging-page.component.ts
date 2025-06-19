import { Component, NgZone, ViewEncapsulation } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { merge } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../firebase-service/user.services';
import { User } from '../../interfaces/user.interface';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../firebase-service/auth.service';

@Component({
  selector: 'app-loging-page',
  standalone: true,
  imports: [CommonModule, MatDividerModule, MatFormFieldModule, MatInputModule, FormsModule, ReactiveFormsModule, MatIconModule, MatButtonModule, RouterLink],
  templateUrl: './loging-page.component.html',
  styleUrls: ['./loging-page.component.scss',
    './loging-page.component-media-query.scss'
  ],
  encapsulation: ViewEncapsulation.None
})
export class LogingPageComponent {
  email = new FormControl('', [Validators.required, Validators.email]);
  password = new FormControl('', Validators.required);
  hide = true;
  LogInError = false;

  errorMessage = '';
  errorMessageLogIn = '';
  errorMessagePassword = ''

  constructor(private userService: UserService, private authService: AuthService, private router: Router, private zone: NgZone) {
    merge(this.email.statusChanges, this.email.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.updateErrorMessage());
    merge(this.password.statusChanges, this.password.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.updateErrorMessagePassword());
  }

  updateErrorMessage() {
    if (this.email.hasError('required')) {
      this.errorMessage = 'Du musst eine E-Mail-Adresse eintragen';
    } else if (this.email.hasError('email')) {
      this.errorMessage = 'Keine gültige E-Mail-Adresse';
    } else {
      this.errorMessage = '';
    }
  }

  updateErrorMessagePassword() {
    if (this.password.hasError('required')) {
      this.errorMessagePassword = 'Bitte geben Sie ein Passwort ein';
    } else {
      this.errorMessagePassword = '';
    }
  }

  getUserList(): User[] {
    return this.userService.allUsers;
  }

  signInWithGoogle() {
    this.authService.signInWithGoogle().then(user => {
      // ggf. navigieren oder Daten speichern
      this.router.navigate(['/main']);
    }).catch(err => {
      // Fehlermeldung anzeigen
    });
  }

  checkValideLogIn() {
    const email = this.email.value?.trim().toLowerCase() || '';
    const password = this.password.value || '';

    this.authService.login(email, password)
      .then((userCredential) => {
        console.log("Erfolgreich eingeloggt:", userCredential.user);
        this.router.navigate(['main'], {
          state: {
            loginEmail: userCredential.user.email,
            loginId: userCredential.user.uid
          }
        }

        );
      })
      .catch((error) => {
        console.error("Login fehlgeschlagen:", error.message);
        this.LogInError = true;
        this.updateErrorLogIn();
      });
  }

  updateErrorLogIn() {
    if (this.LogInError) {
      this.password.markAsTouched();
      this.errorMessagePassword = 'Falsche E-Mail-Adresse oder Passwort';
    } else {
      this.errorMessagePassword = '';
    }
  }

}
