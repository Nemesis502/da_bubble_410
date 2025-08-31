import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, HostListener, Inject, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MenuDialogComponent } from '../menu-dialog/menu-dialog.component';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-add-channel-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    RouterModule,
    CdkTextareaAutosize
  ],
  templateUrl: './add-channel-dialog.component.html',
  styleUrls: [
    './add-channel-dialog.component.scss',
    './add-channel-dialog.media-query.component.scss'
  ]
})
export class AddChannelDialogComponent {
  readonly dialog = inject(MatDialog);
  readonly document = inject(DOCUMENT);
  readonly router = inject(Router);

  channelName = '';
  channelFocused = false;
  channelDescription = '';
  screenWidth = window.innerWidth;
  isSmallScreen = this.screenWidth < 800;

  constructor() {}

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.updateScreenWidth((event.target as Window).innerWidth);
  }

  goToMain(): void {
    this.router.navigate([this.isSmallScreen ? '/main-menu' : '/main']);
    this.dialog.closeAll();
  }

  openAddPeopleMenu(): void {
    this.isSmallScreen
      ? this.openBottomDialog()
      : this.openMiddleDialog();
  }

  updateScreenWidth(width: number): void {
    const wasSmall = this.isSmallScreen;
    this.screenWidth = width;
    this.isSmallScreen = width < 800;

    if (wasSmall !== this.isSmallScreen) {
      this.handleScreenChange();
    }
  }

  handleScreenChange(): void {
    this.dialog.closeAll();
    this.isSmallScreen ? this.switchToMobile() : this.switchToDesktop();
  }

  switchToMobile(): void {
    this.router.navigate(['/addChannelDialog']);
    this.document.body.classList.remove('no-scroll');
  }

  switchToDesktop(): void {
    this.router.navigate(['/main']);
    this.dialog.open(AddChannelDialogComponent, {
      panelClass: 'middle-dialog-panel'
    });
  }

  openBottomDialog(): void {
    this.dialog.open(MenuDialogComponent, {
      position: { bottom: '0' },
      maxWidth: '100vw',
      width: '100vw',
      panelClass: 'bottom-dialog-panel',
      data: this.getDialogData()
    });
  }

  openMiddleDialog(): void {
    this.dialog.open(MenuDialogComponent, {
      panelClass: 'middle-dialog-panel',
      data: this.getDialogData()
    });
  }

  getDialogData() {
    return {
      source: 'add-channel',
      channelName: this.channelName,
      channelDescription: this.channelDescription
    };
  }
}