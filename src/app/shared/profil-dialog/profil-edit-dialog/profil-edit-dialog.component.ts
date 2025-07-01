import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { SessionService } from '../../services/currentUserSession.service';
import { appUser } from '../../../interfaces/user.interface';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.services';
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
    FormsModule
  ],
  templateUrl: './profil-edit-dialog.component.html',
  styleUrl: './profil-edit-dialog.component.scss'
})
export class ProfilEditDialogComponent {
  newName = '';
  currentUser: appUser | null = null;

  constructor(private dialogRef: MatDialogRef<ProfilEditDialogComponent>, private userSession: SessionService, private userService: UserService) {
    this.currentUser = this.userSession.getCurrentUser();
  }

  onClose() {
    this.dialogRef.close();
  }

  saveNewUserName() {
    if (this.currentUser?.id == 'Guest') {
      this.currentUser.userName = this.newName;
      this.userSession.setCurrentUser(this.currentUser!);
      this.dialogRef.close();
    } else {
      this.userService.updateUserName(this.currentUser?.id!, this.newName).then(() =>
        this.dialogRef.close()
      )
    }
  }
}