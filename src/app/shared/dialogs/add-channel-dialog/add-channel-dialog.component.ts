import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, HostListener, Inject, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MenuDialogComponent } from '../menu-dialog/menu-dialog.component';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
} from '@angular/fire/firestore';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Optional } from '@angular/core';

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
    CdkTextareaAutosize,
  ],
  templateUrl: './add-channel-dialog.component.html',
  styleUrls: [
    './add-channel-dialog.component.scss',
    './add-channel-dialog.media-query.component.scss',
  ],
})
export class AddChannelDialogComponent {
  readonly dialog = inject(MatDialog);
  readonly dialogRef = inject(MatDialogRef<AddChannelDialogComponent>, {
    optional: true,
  });
  readonly document = inject(DOCUMENT);
  readonly router = inject(Router);
  readonly firestore = inject(Firestore);

  channelName = '';
  channelFocused = false;
  channelDescription = '';
  screenWidth = window.innerWidth;
  isSmallScreen = this.screenWidth < 800;
  channelNameTaken = false;
  nameInput$ = new Subject<string>();

  constructor() {
    this.nameInput$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((name) => this.checkChannelName(name));
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.updateScreenWidth((event.target as Window).innerWidth);
  }

  goToMain(): void {
    this.router.navigate([this.isSmallScreen ? '/main-menu' : '/main']);
    this.dialog.closeAll();
  }

  openAddPeopleMenu(): void {
    this.isSmallScreen ? this.openBottomDialog() : this.openMiddleDialog();
  }

  updateScreenWidth(width: number): void {
    const wasSmall = this.isSmallScreen;
    this.screenWidth = width;
    this.isSmallScreen = width < 800;

    if (wasSmall !== this.isSmallScreen) {
      this.handleScreenChange();
    }
  }

closeDialog(): void {
  if (this.dialogRef) {
    this.dialogRef.close();
  } else {
    this.router.navigate(['/main-menu']);
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
      panelClass: 'middle-dialog-panel',
    });
  }

  openBottomDialog(): void {
    this.dialog.open(MenuDialogComponent, {
      position: { bottom: '0' },
      maxWidth: '100vw',
      width: '100vw',
      panelClass: 'bottom-dialog-panel',
      data: this.getDialogData(),
    });
  }

  openMiddleDialog(): void {
    this.closeDialog();
    this.dialog.open(MenuDialogComponent, {
      panelClass: 'middle-dialog-panel',
      data: this.getDialogData(),
    });
  }

  getDialogData() {
    return {
      source: 'add-channel',
      channelName: this.channelName,
      channelDescription: this.channelDescription,
    };
  }

  onChannelNameChange(name: string) {
    this.nameInput$.next(name.trim());
  }

  async checkChannelName(name: string) {
    if (!name) {
      this.channelNameTaken = false;
      return;
    }

    const channelsRef = collection(this.firestore, 'channels');
    const q = query(channelsRef, where('name', '==', name));
    const querySnapshot = await getDocs(q);
    this.channelNameTaken = !querySnapshot.empty;
  }
}
