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
  animation = false;
  userName = '';
  userEmail = '';
  userPassword = '';
  imgId = 0;

  imgArray = [
    {
      id: 1
    },
    {
      id: 2
    },
    {
      id: 3
    },
    {
      id: 4
    },
    {
      id: 5
    },
    {
      id: 6
    },
  ]

  constructor(private renderer: Renderer2, private router: Router) {
    const navigation = this.router.getCurrentNavigation();
    console.log(navigation?.extras.state);
    const state = navigation?.extras.state as {
      singName: string;
      singEmail: string;
      singPassword: string;
    };
    if (state) {
      this.userName = state.singName ?? '';
      this.userEmail = state.singEmail ?? '';
      this.userPassword = state.singPassword ?? '';
    }
  }

  chooseImg(id: number) {
    this.imgId = id;
  }

  sendNewProfil() {
    console.log('userName:', this.userName);
    console.log('Email:', this.userEmail);
    console.log('Password:', this.userPassword);
    console.log('Bild:', this.imgId);

    // this.animation = true;
    // this.renderer.setStyle(document.body, 'overflow', 'hidden');
    // setTimeout(() => {
    //   this.router.navigate(['/']);
    //   this.renderer.removeStyle(document.body, 'overflow');
    // }, 2000);
  }
}
