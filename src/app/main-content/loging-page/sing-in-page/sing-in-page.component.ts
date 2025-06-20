import { NgClass } from '@angular/common';
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

@Component({
  selector: 'app-sing-in-page',
  standalone: true,
  imports: [MatDividerModule, MatFormFieldModule, MatInputModule, FormsModule, ReactiveFormsModule, MatIconModule, MatButtonModule, RouterLink],
  templateUrl: './sing-in-page.component.html',
  styleUrl: './sing-in-page.component.scss'
})
export class SingInPageComponent {
  StrongPasswordRegx: RegExp =
    /^(?=[^A-Z]*[A-Z])(?=[^a-z]*[a-z])(?=\D*\d).{8,}$/;
  text = new FormControl('', [Validators.required]);
  email = new FormControl('', [Validators.required, Validators.email]);
  password = new FormControl('', [Validators.required, Validators.pattern(this.StrongPasswordRegx)]);
  hide = true;

  errorMessageName = '';
  errorMessageEmail = '';
  errorMessagePassword = '';

  constructor(private router: Router) {
    merge(this.text.statusChanges, this.text.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.updateErrorMessageName());
    merge(this.email.statusChanges, this.email.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.updateErrorMessageEmail());
    merge(this.password.statusChanges, this.password.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.updateErrorMessagePassword());
  }

  updateErrorMessageName() {
    if (this.text.hasError('required')) {
      this.errorMessageName = 'Bitte schreiben sie einen Namen.';
    } else {
      this.errorMessageName = '';
    }
  }

  updateErrorMessageEmail() {
    if (this.email.hasError('required')) {
      this.errorMessageEmail = 'Du musst eine E-Mail-Adresse eintragen';
    } else if (this.email.hasError('email')) {
      this.errorMessageEmail = 'Keine gültige E-Mail-Adresse';
    } else {
      this.errorMessageEmail = '';
    }
  }

  updateErrorMessagePassword() {
    if (this.password.hasError('required')) {
      this.errorMessagePassword = 'Bitte geben Sie ein Passwort ein';
    } else if (this.password.hasError('pattern')) {
      this.errorMessagePassword = 'Passwort muss mindestens 8 Zeichen lang sein, eine Zahl, ein Groß- und Kleinbuchstaben enthalten';
    }
    else {
      this.errorMessagePassword = '';
    }
  }

  checkFormular() {
    this.markedInputs();
    this.updateErrorMessage();

    if (this.text.valid && this.email.valid && this.password.valid) {
      console.log("Text" + this.text.value, "Email" + this.email.value, "Password" + this.password.value);
      let lowerCaseEmail = this.email.value?.trim().toLocaleLowerCase();
      this.nextPage(lowerCaseEmail);
    }
  }

  markedInputs() {
    this.text.markAsTouched();
    this.email.markAsTouched();
    this.password.markAsTouched();
  }

  updateErrorMessage() {
    this.updateErrorMessageName();
    this.updateErrorMessageEmail();
    this.updateErrorMessagePassword();
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
}


