import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ProfilEditDialogComponent } from './profil-edit-dialog/profil-edit-dialog.component';

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

  isUser = true;

  constructor(private dialogRef: MatDialogRef<ProfilDialogComponent>) { }

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
}
