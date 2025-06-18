import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { ProfilDialogComponent } from '../../../shared/profil-dialog/profil-dialog.component';
import { AuthService } from '../../../firebase-service/auth.service';

@Component({
  selector: 'app-menu-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule
  ],
  templateUrl: './menu-dialog.component.html',
  styleUrl: './menu-dialog.component.scss'
})
export class MenuDialogComponent {
  readonly dialog = inject(MatDialog);

  isProfilHovered = false;
  isActive = true;

  constructor(
    private router: Router,
    private dialogRef: MatDialogRef<MenuDialogComponent>,
    private authService: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: { source: string }) { }

  openProfileDialog() {
    this.closeDialog();
    this.dialog.open(ProfilDialogComponent, {
      maxWidth: '90vw',
      panelClass: 'bottom-dialog-panel'
    });
  }

  logout() {
    this.authService.logout().then(() => {
      this.router.navigate(['/']);
    });

    this.closeDialog();
  }

  closeDialog() {
    this.dialogRef.close();
  }

  toggleActive(isActive: boolean): void {
    this.isActive = isActive;
  }
}
