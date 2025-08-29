import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { MenuDialogComponent } from '../dialogs/menu-dialog/menu-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { appUser } from '../../interfaces/user.interface';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SearchComponent } from '../search/search.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    SearchComponent
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss', './header.media-query.component.scss']
})
export class HeaderComponent {
  @Output() chatSelected = new EventEmitter<string>();
  @Output() chatTypeSelected = new EventEmitter<'channel' | 'conversation'>();
  @Output() closeNewMessage = new EventEmitter<void>();

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
