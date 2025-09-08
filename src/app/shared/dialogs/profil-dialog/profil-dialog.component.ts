import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Inject, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { ProfilEditDialogComponent } from '../profil-edit-dialog/profil-edit-dialog.component';
import { appUser } from '../../../interfaces/user.interface';
import { DirectMessageService } from '../../services/direct-message.service';
import { NewMessageSendingService } from '../../services/new-message-sending.service';

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
  styleUrls: [
    './profil-dialog.component.scss',
    './profil-dialog.media-query.component.scss',
  ],
})
export class ProfilDialogComponent {
  private readonly dialog = inject(MatDialog);
  currentUser: appUser | null;
  isUser: boolean;
  loggedInUserId: string | null;
  screenWidth = window.innerWidth;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ProfilDialogData,
    private directMessageService: DirectMessageService,
    private router: Router,
    private dialogRef: MatDialogRef<ProfilDialogComponent>,
    private newMessageService: NewMessageSendingService
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
    if (this.screenWidth < 800) {
      this.forSmallScreen();
    } else {
      this.forBigScreen();
    }
    // this.dialog.open(ProfilEditDialogComponent, {
    //   panelClass: 'middle-dialog-panel',
    // });
  }
  
  forSmallScreen(): void {
    this.closeDialog();
    this.dialog.open(ProfilEditDialogComponent, {
      panelClass: 'middle-dialog-panel',
      data: {
        user: this.currentUser,
        loggedUser: this.currentUser?.id,
        isUser: true,
      },
    });
  }

  forBigScreen(): void {
    this.closeDialog();
    this.dialog.open(ProfilEditDialogComponent, {
      position: { top: '100px', right: '20px' },
      panelClass: 'top-right-dialog-panel',
      data: {
        user: this.currentUser,
        loggedUser: this.currentUser?.id,
        isUser: true,
      },
    });
  }

  openDirectMessage(): void {
    const senderId = this.loggedInUserId;
    const receiverId = this.currentUser?.id;
    if (!senderId || !receiverId) {
      return;
    }
    this.directMessageService
      .findAndOpenConversation(senderId, receiverId, {
        onConversationOpened: (conversationId: string) => {
          if (window.innerWidth < 800) {
            this.router.navigate([
              '/chat-container/conversation',
              conversationId,
            ]);
          } else {
            this.newMessageService.selectChat(conversationId, 'conversation');
          }
        },
      })
      .then(() => this.closeDialog())
      .catch((err) => console.error('Failed to open conversation:', err));
  }

  canOpenConversation(): boolean {
    return !!this.loggedInUserId && !!this.currentUser?.id;
  }
}
