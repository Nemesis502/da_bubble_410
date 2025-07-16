import { CommonModule } from '@angular/common';
import { Component, inject, Renderer2 } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { appUser } from '../../../../interfaces/user.interface';
import { UserService } from '../../../../shared/services/user.services';
import { AuthService } from '../../../../shared/services/auth.service';

@Component({
  selector: 'app-choose-avatar-page',
  standalone: true,
  imports: [CommonModule, MatDividerModule, MatFormFieldModule, MatInputModule, FormsModule, ReactiveFormsModule, MatIconModule, MatButtonModule],
  templateUrl: './choose-avatar-page.component.html',
  styleUrls: ['./choose-avatar-page.component.scss',
    './choose-avatar-page.component-media-query.scss'
  ]
})
export class ChooseAvatarPageComponent {
  animation = false;
  userName = '';
  userEmail = '';
  userPassword = '';
  imgId = 0;
  uid = '';
  isGoogleLogin? = false;
  googleUid? = "";
  newUser!: appUser;


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

  constructor(private authService: AuthService, private renderer: Renderer2, private router: Router, private userService: UserService) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as {
      singName: string;
      singEmail: string;
      singPassword?: string;
      isGoogleLogin?: boolean;
      googleUid?: string;
    };
    this.setGoogleLogin(state.isGoogleLogin!, state.googleUid!)
    if (state) {
      this.userName = state.singName ?? '';
      this.userEmail = state.singEmail ?? '';
      this.userPassword = state.singPassword ?? '';
    }
  }

  setGoogleLogin(isGoogleLogin: boolean, googleUid: string) {
    this.isGoogleLogin = isGoogleLogin ?? false;
    this.googleUid = googleUid ?? '';
  }

  chooseImg(id: number) {
    this.imgId = id;
  }

  async sendNewProfil() {
    if (this.isGoogleLogin) {
      this.uid = this.googleUid!;
      this.newUser = this.setNewUser();
      this.userService.addUser(this.uid, this.newUser);
      this.loginWithGoogle()
    } else {
      this.uid = await this.authService.registerUser(this.userEmail, this.userPassword);
      this.newUser = this.setNewUser();
      this.userService.addUser(this.uid, this.newUser);
      this.returnToStart();
    }
  }

  setNewUser() {
    return {
      userName: this.userName,
      profilePic: this.imgId,
      status: false,
      email: this.userEmail
    }
  }

  loginWithGoogle() {
    this.animation = true;
    this.renderer.setStyle(document.body, 'overflow', 'hidden');
    setTimeout(() => {
      this.router.navigate(['main'], {
        state: {
          loginEmail: this.userEmail,
          loginId: this.uid
        }
      });
      this.renderer.removeStyle(document.body, 'overflow');
    }, 2000);
  }

  previousPage() {
    if (this.isGoogleLogin) {
      this.router.navigate(['/']);
    } else {
      this.router.navigate(['/singIn']);
    }
  }

  returnToStart() {
    this.animation = true;
    this.renderer.setStyle(document.body, 'overflow', 'hidden');
    setTimeout(() => {
      this.router.navigate(['/']);
      this.renderer.removeStyle(document.body, 'overflow');
    }, 2000);
  }
}
