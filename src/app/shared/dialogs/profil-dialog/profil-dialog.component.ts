import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ProfilEditDialogComponent } from '../profil-edit-dialog/profil-edit-dialog.component';
import { appUser } from '../../../interfaces/user.interface';
import { Inject } from '@angular/core';
import { DirectMessageService } from '../../services/direct-message.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profil-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './profil-dialog.component.html',
  styleUrl: './profil-dialog.component.scss'
})
export class ProfilDialogComponent {
  readonly dialog = inject(MatDialog);
  currentUser: appUser | null = null;
  isUser = true;
  loggedInUserId: string | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private directMessageService: DirectMessageService,
    private router: Router,
    private dialogRef: MatDialogRef<ProfilDialogComponent>
  ) {
    this.currentUser = data.user;
    this.loggedInUserId = data.loggedUser;
    this.isUser = data.isUser ?? false;
  }

  onClose() {
    this.dialogRef.close();
  }

  openProfilEditDialog() {
    this.onClose();
    this.dialog.open(ProfilEditDialogComponent, {
      maxWidth: '90vw',
      panelClass: 'bottom-dialog-panel'
    });
  }

  openConversation() {
    if (!this.currentUser?.id || !this.loggedInUserId) {
      return;
    }
    console.log(this.loggedInUserId, this.currentUser.id)
    this.directMessageService
      .findAndOpenConversation(this.loggedInUserId, this.currentUser.id)
      .then(() => this.dialogRef.close())
      .catch(err => console.error('Failed to open conversation:', err));
  }
}
