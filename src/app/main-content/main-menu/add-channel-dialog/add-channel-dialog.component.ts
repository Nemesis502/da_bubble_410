import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterModule } from '@angular/router';
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
  styleUrl: './add-channel-dialog.component.scss'
})
export class AddChannelDialogComponent {
  readonly dialog = inject(MatDialog);
  readonly document = inject(DOCUMENT);

  channelName = '';
  channelFocused = false;
  channelDescription = '';

  openAddPeoplMenu(): void {
    this.dialog.open(MenuDialogComponent, {
      position: { bottom: '0' },
      maxWidth: '100vw',
      width: '100vw',
      panelClass: 'bottom-dialog-panel',
      data: { source: 'add-channel' }
    });
  }
}
