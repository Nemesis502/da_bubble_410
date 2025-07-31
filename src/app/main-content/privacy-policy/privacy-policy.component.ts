import { CommonModule, ViewportScroller } from '@angular/common';
import { Component } from '@angular/core';
import { Location } from '@angular/common';
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
  constructor(private router: Router, private viewportScroller: ViewportScroller, private location: Location) { }

  goTo(id: string) {
    this.viewportScroller.scrollToAnchor(id);
  }

  goBack() {
    this.location.back();
  }
}
