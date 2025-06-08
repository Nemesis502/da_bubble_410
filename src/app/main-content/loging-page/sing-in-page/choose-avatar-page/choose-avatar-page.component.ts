import { CommonModule } from '@angular/common';
import { Component, Renderer2 } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-choose-avatar-page',
  standalone: true,
  imports: [CommonModule, MatDividerModule, MatFormFieldModule, MatInputModule, FormsModule, ReactiveFormsModule, MatIconModule, MatButtonModule, RouterLink],
  templateUrl: './choose-avatar-page.component.html',
  styleUrl: './choose-avatar-page.component.scss'
})
export class ChooseAvatarPageComponent {
  constructor(private renderer: Renderer2, private router: Router) { }
  animation = false;

  sendNewProfil() {
    this.animation = true;
    this.renderer.setStyle(document.body, 'overflow', 'hidden');
    setTimeout(() => {
      this.router.navigate(['/']);
      this.renderer.removeStyle(document.body, 'overflow');
    }, 2000);

  }
}
