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
import { CommonModule } from '@angular/common';
import { AuthService } from '../../shared/services/auth.service';
import { User } from 'firebase/auth';

@Component({
  selector: 'app-loging-page',
  standalone: true,
  imports: [CommonModule, MatDividerModule, MatFormFieldModule, MatInputModule, FormsModule, ReactiveFormsModule, MatIconModule, MatButtonModule, RouterLink],
  templateUrl: './loging-page.component.html',
  styleUrls: ['./loging-page.component.scss',
    'loging-page.component-header-and-footer.scss',
    './loging-page.component-media-query.scss',
  ],
  encapsulation: ViewEncapsulation.None
})
export class LogingPageComponent {
  email = new FormControl('', [Validators.required, Validators.email]);
  password = new FormControl('', Validators.required);
  hide = true;
  LogInError = false;
  showIntro = true;

  errorMessage = '';
  errorMessageLogIn = '';
  errorMessagePassword = ''

  constructor(private authService: AuthService, private router: Router) {
    this.checkIfIntroPlayed();
    merge(this.email.statusChanges, this.email.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.updateErrorMessage());
    merge(this.password.statusChanges, this.password.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.updateErrorMessagePassword());
  }

  checkIfIntroPlayed() {
    let alreadyPlayed = sessionStorage.getItem('introPlayed');
    if (alreadyPlayed) {
      this.showIntro = false;
    } else {
      this.showIntro = true;
      setTimeout(() => {
        sessionStorage.setItem('introPlayed', 'true');
        this.showIntro = false;
      }, 5000);
    }
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
    console.log(this.password);
    
    if (this.password.hasError('required')) {
      this.errorMessagePassword = 'Bitte geben Sie ein Passwort ein';
    } else if (this.password.hasError('falsePassword')) {
      this.errorMessagePassword = 'Falsche E-Mail-Adresse oder Passwort';
    }
    else {
      this.errorMessagePassword = '';
    }
  }

  signInWithGoogle() {
    this.authService.signInWithGoogle().then(async user => {
      let exists = await this.authService.checkUserExistsInFirestore(user.uid);
      if (exists) {
        this.navigateToMainSite(user)
      } else {
        this.navigateToChooseAvatar(user)
      }
    }).catch(err => {
      console.error('Google Login fehlgeschlagen:', err);
    });
  }

  navigateToMainSite(user: User) {
    this.router.navigate(['/main'], {
      state: {
        loginEmail: user.email,
        loginId: user.uid
      }
    });
  }

  navigateToChooseAvatar(user: User) {
    this.router.navigate(['singIn/chooseAvatar'], {
      state: {
        singName: user.displayName,
        singEmail: user.email,
        isGoogleLogin: true,
        googleUid: user.uid,
      }
    });
  }

  checkValideLogIn() {
    const email = this.email.value?.trim().toLowerCase() || '';
    const password = this.password.value || '';
    this.authService.login(email, password).then((userCredential) => {
      this.router.navigate(['main'], {
        state: {
          loginEmail: userCredential.user.email,
          loginId: userCredential.user.uid
        }
      });
    }).catch((error) => {
      console.error("Login fehlgeschlagen:", error.message);
      this.LogInError = true;
      this.updateErrorLogIn();
    });
  }

  loginGuest() {
    this.router.navigate(['main'], {
      state: {
        loginEmail: "email@beispiel.com",
        loginId: "Guest"
      }
    });
  }

  updateErrorLogIn() {
    if (this.LogInError) {
      this.password.setErrors({ falsePassword: true });
      this.password.markAsTouched()
    } else {
      this.errorMessagePassword = '';
    }
  }
}
