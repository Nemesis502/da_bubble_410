import { Component } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { merge } from 'rxjs';

@Component({
  selector: 'app-sing-in-page',
  standalone: true,
  imports: [MatDividerModule, MatFormFieldModule, MatInputModule, FormsModule, ReactiveFormsModule, MatIconModule, MatButtonModule, RouterLink],
  templateUrl: './sing-in-page.component.html',
  styleUrl: './sing-in-page.component.scss'
})
export class SingInPageComponent {
  text = new FormControl('', [Validators.required]);
  email = new FormControl('', [Validators.required, Validators.email]);
  hide = true;

  errorMessageName = '';
  errorMessageEmail = '';

  constructor() {
    merge(this.text.statusChanges, this.text.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.updateErrorMessageName());
    merge(this.email.statusChanges, this.email.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.updateErrorMessageEmail());
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
}
