import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-profil-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './profil-edit-dialog.component.html',
  styleUrl: './profil-edit-dialog.component.scss'
})
export class ProfilEditDialogComponent {

  constructor(private dialogRef: MatDialogRef<ProfilEditDialogComponent>) { }

  onClose() {
    this.dialogRef.close();
  }

}