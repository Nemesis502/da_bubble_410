import { Component, inject, Input } from '@angular/core';
import { MenuDialogComponent } from '../dialogs/menu-dialog/menu-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { appUser } from '../../interfaces/user.interface';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  @Input() currentUser!: appUser | null;

  readonly dialog = inject(MatDialog);

  screenSmall = window.innerWidth < 800;

  openMenuDialog(): void {
    if (this.screenSmall) {
      this.dialog.open(MenuDialogComponent, {
        position: { bottom: '0' },
        maxWidth: '100vw',
        width: '100vw',
        panelClass: 'bottom-dialog-panel',
        data: {
          source: 'main-menu',
        },
      });
    } else {
      this.dialog.open(MenuDialogComponent, {
        position: { top: '80px', right: '16px' },
        maxWidth: '282px',
        maxHeight: '181px',
        panelClass: 'top-right-dialog-panel',
        data: {
          source: 'main-menu',
        }
      });
    }
  }

}
