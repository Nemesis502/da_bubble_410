import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { ProfilDialogComponent } from '../../../shared/profil-dialog/profil-dialog.component';

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

  constructor(private router: Router, private dialogRef: MatDialogRef<MenuDialogComponent>) { }

  openProfileDialog() {
    this.closeDialog();
    this.dialog.open(ProfilDialogComponent, {
      maxWidth: '90vw',
      panelClass: 'bottom-dialog-panel'
    });
  }

  logout() {
    this.router.navigate(['']);
    this.closeDialog();
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
