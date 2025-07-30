import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { LogoComponent } from '../../shared/logo/logo.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-legal-notice',
  standalone: true,
  imports: [
    CommonModule,
    LogoComponent,
  ],
  templateUrl: './legal-notice.component.html',
  styleUrl: './legal-notice.component.scss'
})
export class LegalNoticeComponent {
  constructor(private router: Router, private location: Location) { }

  goBack() {
    // this.router.navigate(['/']);
    this.location.back();
  }
}
