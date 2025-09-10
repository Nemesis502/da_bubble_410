import { CommonModule, ViewportScroller } from '@angular/common';
import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { LogoComponent } from '../../shared/logo/logo.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [
    CommonModule,
    LogoComponent,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.scss'
})
export class PrivacyPolicyComponent {
  constructor(private viewportScroller: ViewportScroller, private location: Location) { }

  goTo(id: string) {
    this.viewportScroller.scrollToAnchor(id);
  }

  goBack() {
    this.location.back();
  }
}
