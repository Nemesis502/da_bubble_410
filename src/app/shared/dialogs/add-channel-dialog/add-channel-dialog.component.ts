import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MenuDialogComponent } from '../menu-dialog/menu-dialog.component';
import { MatDialog } from '@angular/material/dialog';

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
  styleUrls: ['./add-channel-dialog.component.scss', 'add-channel-dialog.media-query.component.scss']
})
export class AddChannelDialogComponent {
  readonly dialog = inject(MatDialog);
  readonly document = inject(DOCUMENT);

  channelName = '';
  channelFocused = false;
  channelDescription = '';
  screenWidth = window.innerWidth;
  screeenSmall = false;
  constructor(private router: Router) { }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.screenWidth = (event.target as Window).innerWidth;
    if (this.screenWidth < 800 && this.screeenSmall === false) {
      this.screeenSmall = true;
      this.dialog.closeAll();
      this.router.navigate(['/addChannelDialog']);
      this.document.body.classList.remove('no-scroll');
    } else if (this.screenWidth >= 800 && this.screeenSmall === true) {
      this.screeenSmall = false;
      this.router.navigate(['/main']);
      this.dialog.open(AddChannelDialogComponent, {
        panelClass: 'middle-dialog-panel'
      });
    }
  }

  goToMain(): void {
    this.router.navigate(['/main']);
    this.dialog.closeAll();
  }

  openAddPeopleMenu(): void {
    if (this.screenWidth < 800) {
      this.dialog.open(MenuDialogComponent, {
        position: { bottom: '0' },
        maxWidth: '100vw',
        width: '100vw',
        panelClass: 'bottom-dialog-panel',
        data: {
          source: 'add-channel',
          channelName: this.channelName,
          channelDescription: this.channelDescription
        }
      });
    } else if (this.screenWidth >= 800) {
      this.dialog.closeAll();
      this.dialog.open(MenuDialogComponent, {
        panelClass: 'middle-dialog-panel',
        data: {
          source: 'add-channel',
          channelName: this.channelName,
          channelDescription: this.channelDescription
        }
      });
    }
  }
}