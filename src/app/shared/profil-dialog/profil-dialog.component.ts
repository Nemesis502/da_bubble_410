import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

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
  isUser = false;

  constructor(private dialogRef: MatDialogRef<ProfilDialogComponent>) { }

  onClose() {
    this.dialogRef.close();
  }
}
