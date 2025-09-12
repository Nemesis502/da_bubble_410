import { Component, EventEmitter, HostListener, inject, Input, Output } from '@angular/core';
import { MenuDialogComponent } from '../dialogs/menu-dialog/menu-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { appUser } from '../../interfaces/user.interface';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SearchComponent } from '../search/search.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, MatIconModule, SearchComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss', './header.media-query.component.scss'],
})
export class HeaderComponent {
  // Emits the selected chat's ID to parent components
  @Output() chatSelected = new EventEmitter<string>();

  // Emits the type of chat selected ('channel' or 'conversation')
  @Output() chatTypeSelected = new EventEmitter<'channel' | 'conversation'>();

  // Emits when the "new message" UI should be closed
  @Output() closeNewMessage = new EventEmitter<void>();

  // Input for the currently logged-in user
  @Input() currentUser!: appUser | null;

  // Injects Angular Material Dialog service for opening dialogs
  readonly dialog = inject(MatDialog);

  // Tracks whether the screen width is small (for responsive behavior)
  screenSmall = window.innerWidth < 1300;

  // Determines which menu dialog to open based on screen size
  openMenuDialog(): void {
    if (this.screenSmall) {
      this.openBottomMenuDialog();
    } else {
      this.openTopRightMenuDialog();
    }
  }

  // Opens a bottom-positioned full-width dialog for small screens
  private openBottomMenuDialog(): void {
    this.dialog.open(MenuDialogComponent, {
      position: { bottom: '0' },
      width: '100vw',
      maxWidth: '100vw',
      panelClass: 'bottom-dialog-panel',
      data: { source: 'main-menu' },
    });
  }

  // Opens a small top-right positioned dialog for larger screens
  private openTopRightMenuDialog(): void {
    this.dialog.open(MenuDialogComponent, {
      position: { top: '100px', right: '20px' },
      maxWidth: '282px',
      maxHeight: '181px',
      panelClass: 'top-right-dialog-panel',
      data: { source: 'main-menu' },
    });
  }
}
