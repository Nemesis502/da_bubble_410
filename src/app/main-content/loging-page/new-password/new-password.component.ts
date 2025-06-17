import { CommonModule } from '@angular/common';
import { Component, Renderer2 } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { merge } from 'rxjs';
import { confirmPasswordValidator } from '../../../shared/services/confirm-password.validator';

@Component({
  selector: 'app-new-password',
  standalone: true,
  imports: [CommonModule, MatDividerModule, MatFormFieldModule, MatInputModule, FormsModule, ReactiveFormsModule, MatIconModule, MatButtonModule, RouterLink],
  templateUrl: './new-password.component.html',
  styleUrl: './new-password.component.scss'
})
export class NewPasswordComponent {

  strongPasswordRegx: RegExp =
    /^(?=[^A-Z]*[A-Z])(?=[^a-z]*[a-z])(?=\D*\d).{8,}$/;

  passwordForm: FormGroup = new FormGroup({
    password: new FormControl<string>('', [Validators.required, Validators.pattern(this.strongPasswordRegx)]),
    passwordContoll: new FormControl<string>('', [Validators.required]),
  },
  { validators: confirmPasswordValidator }
  );
  // password = new FormControl('', [Validators.required, Validators.pattern(this.strongPasswordRegx)]);
  // passwordContoll = new FormControl('', [Validators.required]);;
  errorMessagePassword = '';
  animation = false;
  hide = true;

  constructor(private renderer: Renderer2, private router: Router) {
    // merge(this.password.statusChanges, this.password.valueChanges)
    //   .pipe(takeUntilDestroyed())
    //   .subscribe(() => this.updateErrorMessagePassword());
    // merge(this.passwordContoll.statusChanges, this.passwordContoll.valueChanges)
    //   .pipe(takeUntilDestroyed())
    //   .subscribe(() => this.updateErrorMessagePassword());
  }

  // updateErrorMessagePassword() {
  //   if (this.password.hasError('required')) {
  //     this.errorMessagePassword = 'Bitte geben Sie ein Passwort ein';
  //   } else if (this.password.hasError('pattern')) {
  //     this.errorMessagePassword = 'Passwort muss mindestens 8 Zeichen lang sein, eine Zahl, ein Groß- und Kleinbuchstaben enthalten';
  //   }
  //   else {
  //     this.errorMessagePassword = '';
  //   }
  // }

  // updateErrorMessagePasswordControll() {
  //   if (this.password.hasError('required')) {
  //     this.errorMessagePassword = 'Bitte geben Sie ein Passwort ein';
  //   } else if (this.password.hasError('pattern')) {
  //     this.errorMessagePassword = 'Passwort muss mindestens 8 Zeichen lang sein, eine Zahl, ein Groß- und Kleinbuchstaben enthalten';
  //   }
  //   else {
  //     this.errorMessagePassword = '';
  //   }
  // }

  checkFormular() {

  }

  successfullAnimation() {
    this.animation = true;
    this.renderer.setStyle(document.body, 'overflow', 'hidden');
    setTimeout(() => {
      this.router.navigate(['/']);
      this.renderer.removeStyle(document.body, 'overflow');
    }, 2000);
  }
}
