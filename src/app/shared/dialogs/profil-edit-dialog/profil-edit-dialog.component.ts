import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../services/currentUserSession.service';
import { UserService } from '../../services/user.services';
import { appUser } from '../../../interfaces/user.interface';

@Component({
  selector: 'app-profil-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
  ],
  templateUrl: './profil-edit-dialog.component.html',
  styleUrls: [
    './profil-edit-dialog.component.scss',
    './profil-edit-dialog.media-query.component.scss',
  ],
})
export class ProfilEditDialogComponent {
  newName = '';
  currentUser: appUser | null;
  avatars: number[] = [1, 2, 3, 4, 5, 6];
  selectedAvatar: number = 0;
  constructor(
    private dialogRef: MatDialogRef<ProfilEditDialogComponent>,
    private userSession: SessionService,
    private userService: UserService
  ) {
    this.currentUser = this.userSession.getCurrentUser();
    this.selectedAvatar = this.currentUser?.profilePic ?? 0;
  }

  closeDialog(): void {
    this.dialogRef.close();
  }


  selectAvatar(avatar: number): void {
    this.selectedAvatar = avatar;
  }


  async saveUserName(): Promise<void> {
    if (!this.currentUser) return;

    const updatedUser: appUser = {
      ...this.currentUser,
      userName: this.newName.trim() || this.currentUser.userName,
      profilePic: this.selectedAvatar,
    };

    if (!this.isGuestUser()) {
      await this.userService.updateUser(this.currentUser.id!, updatedUser);
    }

    this.userSession.setCurrentUser(updatedUser); // ✅ types now match
    this.dialogRef.close(updatedUser);
  }


  buildUpdatedUser(): appUser {
    return { ...this.currentUser!, userName: this.newName };
  }

  isGuestUser(): boolean {
    return this.currentUser?.id === 'Guest';
  }

  async updateUserNameInService(): Promise<void> {
    await this.userService.updateUserName(this.currentUser!.id!, this.newName);
  }
}
