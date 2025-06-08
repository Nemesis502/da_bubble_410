import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

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

  constructor(private router: Router) { }

  logout() {
    this.router.navigate(['']);
    this.closeDialog();
  }

  closeDialog() {
    this.dialog.closeAll();
  }
}
