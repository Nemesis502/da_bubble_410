import { Component } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { merge } from 'rxjs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AuthService } from '../../../shared/services/auth.service';
import { ConfirmErrorStateMatcher } from '../new-password/confirm-error-state.matcher';

@Component({
  selector: 'app-sing-in-page',
  standalone: true,
  imports: [MatDividerModule, MatFormFieldModule, MatInputModule, FormsModule, ReactiveFormsModule, MatIconModule, MatButtonModule, RouterLink, MatCheckboxModule],
  templateUrl: './sing-in-page.component.html',
  styleUrls: ['./sing-in-page.component.scss',
    './sing-in-page.component-media-query.scss'
  ],
})
export class SingInPageComponent {
  strongPasswordRegx: RegExp = /^.{6,}$/;
  text = new FormControl('', [Validators.required, Validators.pattern(/^.{6,}$/)]);
  email = new FormControl('', [Validators.required, Validators.email, Validators.pattern(/^[^\s@]+@(?:[^\s@]+\.)+[A-Za-z]{2,}$/)]);
  password = new FormControl('', [Validators.required, Validators.pattern(this.strongPasswordRegx)]);
  passwordConfirm = new FormControl('', [Validators.required]);

  hide = true;
  checkedPrivacy = false;
  checkboxTouched = false;
  confirmMatcher = new ConfirmErrorStateMatcher();

  errorMessageName = '';
  errorMessageEmail = '';
  errorMessagePassword = '';
  errorMessagePasswordConfrim = '';

  constructor(private router: Router, private authService: AuthService) {
    merge(this.text.statusChanges, this.text.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.updateErrorMessageName());
    merge(this.email.statusChanges, this.email.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.updateErrorMessageEmail();
        this.updateErrorMessagePasswordConfrim();
      });
    merge(this.password.statusChanges, this.password.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.updateErrorMessagePassword());

    merge(this.passwordConfirm.statusChanges, this.passwordConfirm.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.updateErrorMessagePasswordConfrim());
  }

  updateErrorMessageName() {
    if (this.text.hasError('required') || this.text.hasError('pattern')) {
      this.errorMessageName = 'Bitte schreiben sie Ihren Vor- und Nachnamen.';
    } else {
      this.errorMessageName = '';
    }
  }

  updateErrorMessageEmail() {
    if (this.email.hasError('required')) {
      this.errorMessageEmail = 'Du musst eine E-Mail-Adresse eintragen';
    } else if (this.email.hasError('email') || this.email.hasError('pattern')) {
      this.errorMessageEmail = 'Keine gültige E-Mail-Adresse';
    } else if (this.email.hasError('emailExists')) {
      this.errorMessageEmail = 'Diese E-Mail ist bereits registriert.';
    } else {
      this.errorMessageEmail = '';
    }
  }

  updateErrorMessagePassword() {
    if (this.password.hasError('required')) {
      this.errorMessagePassword = 'Bitte geben Sie ein Passwort ein';
    } else if (this.password.hasError('pattern')) {
      this.errorMessagePassword = 'Passwort muss mindestens 6 Zeichen lang sein.';
    }
    else {
      this.errorMessagePassword = '';
    }
  }

  updateErrorMessagePasswordConfrim() {
    let pwd = this.password.value ?? '';
    let conf = this.passwordConfirm.value ?? '';
    let mismatch = pwd !== '' && conf !== '' && pwd !== conf;

    const errors = this.passwordConfirm.errors || {};
    if (mismatch) {
      this.passwordConfirm.setErrors({ ...errors, PasswordNoMatch: true });
      this.errorMessagePasswordConfrim = 'Ihre Passwörter stimmen nicht überein.';
    } else {
      if ('PasswordNoMatch' in errors) delete (errors as any)['PasswordNoMatch'];
      this.passwordConfirm.setErrors(Object.keys(errors).length ? errors : null);
      this.errorMessagePasswordConfrim = '';
    }
  }

  async checkFormular() {
    this.markedInputs();
    this.updateErrorMessage();

    if (this.text.valid && this.email.valid && this.password.valid) {
      let lowerCaseEmail = this.email.value?.trim().toLocaleLowerCase();
      await this.checkUserExistAuth(lowerCaseEmail!);
    }
  }

  async checkUserExistAuth(lowerCaseEmail: string) {
    let emailExists = await this.authService.checkUserExistsByEmail(lowerCaseEmail);
    if (emailExists) {
      this.email.setErrors({ emailExists: true });
      return;
    }
    this.email.setErrors(null);
    this.nextPage(lowerCaseEmail);
  }

  markedInputs() {
    this.text.markAsTouched();
    this.email.markAsTouched();
    this.password.markAsTouched();
    this.passwordConfirm.markAsTouched();
  }

  updateErrorMessage() {
    this.updateErrorMessageName();
    this.updateErrorMessageEmail();
    this.updateErrorMessagePassword();
    this.updateErrorMessagePasswordConfrim()
  }

  nextPage(lowerCaseEmail: string | undefined) {
    this.router.navigate(['singIn/chooseAvatar'], {
      state: {
        singName: this.text.value,
        singEmail: lowerCaseEmail,
        singPassword: this.password.value
      }
    });
  }

  acceptPrivacy() {
    this.checkedPrivacy = !this.checkedPrivacy;
    if (this.checkedPrivacy === false) {
      this.checkboxTouched = true;
    } else {
      this.checkboxTouched = false;
    }
  }
}
