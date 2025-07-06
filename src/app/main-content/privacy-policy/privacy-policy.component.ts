import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LogoComponent } from '../../shared/logo/logo.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [
    CommonModule,
    LogoComponent
  ],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.scss'
})
export class PrivacyPolicyComponent {
  constructor(private router: Router) { }

  goBack() {
    this.router.navigate(['/']);
  }
}
