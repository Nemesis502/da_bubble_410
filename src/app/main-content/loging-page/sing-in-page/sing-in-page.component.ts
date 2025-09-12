import { Component } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { AuthService } from '../../../shared/services/auth.service';
import { Location } from '@angular/common';

import { AbstractControl, ValidationErrors, ValidatorFn, FormControl as NgFormControl } from '@angular/forms';
function matchConfirmValidator(passwordCtrl: NgFormControl): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const pwd = passwordCtrl.value ?? '';
    const conf = control.value ?? '';
    if (!pwd || !conf) return null;
    return pwd !== conf ? { PasswordNoMatch: true } : null;
  };
}

@Component({
  selector: 'app-sing-in-page',
  standalone: true,
  imports: [
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    RouterLink,
    MatCheckboxModule,
  ],
  templateUrl: './sing-in-page.component.html',
  styleUrls: ['./sing-in-page.component.scss', './sing-in-page.component-media-query.scss'],
})
export class SingInPageComponent {
  hide = true;
  checkedPrivacy = false;
  checkboxTouched = false;
  errorMessageName = '';
  errorMessageEmail = '';
  errorMessagePassword = '';
  errorMessagePasswordConfrim = '';

  // Regeln
  private strongPasswordRegx: RegExp = /^.{6,}$/;

  text = new FormControl<string>('', [
    Validators.required,
    Validators.pattern(/^.{6,}$/),
  ]);

  email = new FormControl<string>('', [
    Validators.required,
    Validators.email,
    Validators.pattern(/^[^\s@]+@(?:[^\s@]+\.)+[A-Za-z]{2,}$/),
  ]);

  password = new FormControl<string>('', [
    Validators.required,
    Validators.pattern(this.strongPasswordRegx), // min. 6 Zeichen
  ]);

  passwordConfirm = new FormControl<string>('', [Validators.required]);

  constructor(private router: Router, private authService: AuthService) {
    this.passwordConfirm.addValidators(matchConfirmValidator(this.password));

    this.password.valueChanges
      ?.pipe(takeUntilDestroyed())
      .subscribe(() => this.passwordConfirm.updateValueAndValidity({ onlySelf: true, emitEvent: false }));


    merge(this.text.statusChanges, this.text.valueChanges)
      ?.pipe(takeUntilDestroyed())
      .subscribe(() => this.updateErrorMessageName());
    merge(this.email.statusChanges, this.email.valueChanges)
      ?.pipe(takeUntilDestroyed())
      .subscribe(() => this.updateErrorMessageEmail());
    merge(this.password.statusChanges, this.password.valueChanges)
      ?.pipe(takeUntilDestroyed())
      .subscribe(() => this.updateErrorMessagePassword());
  }

  updateErrorMessageName() {
    this.errorMessageName = (this.text.hasError('required') || this.text.hasError('pattern'))
      ? 'Bitte schreiben sie Ihren Vor- und Nachnamen.'
      : '';
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
    } else {
      this.errorMessagePassword = '';
    }
  }

  updateErrorMessagePasswordConfrim() {
    this.errorMessagePasswordConfrim = this.passwordConfirm.hasError('PasswordNoMatch')
      ? 'Ihre Passwörter stimmen nicht überein.'
      : '';
  }

  async checkFormular() {
    this.markedInputs();
    this.updateErrorMessageName();
    this.updateErrorMessageEmail();
    this.updateErrorMessagePassword();
    this.updateErrorMessagePasswordConfrim();

    if (this.text.invalid || this.email.invalid || this.password.invalid || this.passwordConfirm.invalid) return;
    if (!this.checkedPrivacy) {
      this.checkboxTouched = true;
      return;
    }

    const lowerCaseEmail = this.email.value!.trim().toLowerCase();
    await this.checkUserExistAuth(lowerCaseEmail);
  }

  async checkUserExistAuth(lowerCaseEmail: string) {
    const emailExists = await this.authService.checkUserExistsByEmail(lowerCaseEmail);
    if (emailExists) {
      this.email.setErrors({ emailExists: true });
      this.email.markAsTouched();
      return;
    }
    if (this.email.hasError('emailExists')) this.email.setErrors(null);

    this.nextPage(lowerCaseEmail);
  }

  nextPage(lowerCaseEmail: string | undefined) {
    this.router.navigate(['singIn/chooseAvatar'], {
      state: {
        singName: this.text.value,
        singEmail: lowerCaseEmail,
        singPassword: this.password.value,
      },
    });
  }

  markedInputs() {
    this.text.markAsTouched();
    this.email.markAsTouched();
    this.password.markAsTouched();
    this.passwordConfirm.markAsTouched();
  }

  acceptPrivacy() {
    this.checkedPrivacy = !this.checkedPrivacy;
    this.checkboxTouched = !this.checkedPrivacy;
  }
}
