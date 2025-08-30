import { CommonModule } from '@angular/common';
import { Component, inject, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { ProfilEditDialogComponent } from '../profil-edit-dialog/profil-edit-dialog.component';
import { appUser } from '../../../interfaces/user.interface';
import { DirectMessageService } from '../../services/direct-message.service';

interface ProfilDialogData {
  user: appUser;
  loggedUser: string;
  isUser?: boolean;
}

@Component({
  selector: 'app-profil-dialog',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './profil-dialog.component.html',
  styleUrls: ['./profil-dialog.component.scss', './profil-dialog.media-query.component.scss'],
})
export class ProfilDialogComponent {
  private readonly dialog = inject(MatDialog);
  currentUser: appUser | null;
  isUser: boolean;
  loggedInUserId: string | null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ProfilDialogData,
    private directMessageService: DirectMessageService,
    private router: Router,
    private dialogRef: MatDialogRef<ProfilDialogComponent>
  ) {
    this.currentUser = data.user;
    this.loggedInUserId = data.loggedUser;
    this.isUser = data.isUser ?? false;
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  openEditProfilDialog(): void {
    this.closeDialog();
    this.dialog.open(ProfilEditDialogComponent, { panelClass: 'middle-dialog-panel' });
  }

  openDirectMessage(): void {
    const senderId = this.loggedInUserId;
    const receiverId = this.currentUser?.id;

    if (!senderId || !receiverId) {
      console.error('Cannot open conversation: missing user IDs');
      return;
    }

    this.directMessageService
      .findAndOpenConversation(senderId, receiverId)
      .then(() => this.closeDialog())
      .catch(err => console.error('Failed to open conversation:', err));
  }

  canOpenConversation(): boolean {
    return !!this.loggedInUserId && !!this.currentUser?.id;
  }
}