import { CommonModule } from '@angular/common';
import { Component, Renderer2 } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { merge } from 'rxjs';
import { AuthService } from '../../../firebase-service/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, MatDividerModule, MatFormFieldModule, MatInputModule, FormsModule, ReactiveFormsModule, MatIconModule, MatButtonModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent {
  email = new FormControl('', [Validators.required, Validators.email]);
  errorMessageEmail = '';
  animation = false;

  constructor(private authService: AuthService, private renderer: Renderer2, private router: Router) {
    merge(this.email.statusChanges, this.email.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.updateErrorMessageEmail());
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

  async checkFormular() {
    if (this.email.valid) {
      await this.authService.sendNewPasswordLink(this.email.value!)
      this.successfullAnimation()
    } else {
      this.email.markAsTouched();
      this.errorMessageEmail = 'Keine gültige E-Mail-Adresse';
    }
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
