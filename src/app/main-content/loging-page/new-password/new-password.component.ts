import { CommonModule } from '@angular/common';
import { Component, inject, Renderer2 } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { merge } from 'rxjs';
import { confirmPasswordValidator } from '../../../shared/services/confirm-password.validator';
import { Auth } from '@angular/fire/auth';
import { AuthService } from '../../../firebase-service/auth.service';

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
  private route = inject(ActivatedRoute);
  oobCode: string | null = null;
  errorMessagePassword = '';
  animation = false;
  hide = true;

  constructor(private renderer: Renderer2, private router: Router, private authService: AuthService) {
    this.route.queryParamMap.subscribe(params => {
      this.oobCode = params.get('oobCode');
    });
  }

  async sendNewPassword() {
    if (!this.oobCode) {
      console.error('oobCode fehlt.');
      return;
    }
    let newPassword = this.passwordForm.value.password;
    await this.authService.setNewPassword(this.oobCode, newPassword);
    this.successfullAnimation();
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
