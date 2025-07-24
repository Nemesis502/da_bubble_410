import { CommonModule } from '@angular/common';
import { Component, Inject, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { appUser } from '../../../interfaces/user.interface';
import { Channel } from '../../../interfaces/channel.interface';
import { SessionService } from '../../services/currentUserSession.service';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FirestoreService } from '../../services/firestore.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-member-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './member-dialog.component.html',
  styleUrl: './member-dialog.component.scss'
})
export class MemberDialogComponent {
  readonly firestoreService = inject(FirestoreService);
  readonly userSession = inject(SessionService);

  channelId = '';
  channel: Channel | null = null;
  members = signal<appUser[]>([]);
  currentUser: appUser | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { channelId: any; },
  ) { }

  async ngOnInit(): Promise<void> {
    this.currentUser = this.userSession.getCurrentUser();
    this.channelId = this.data.channelId;
    await this.loadChannel();
    await this.loadMembers();

    // console.log('Channel ID:', this.channelId);
    // console.log('Channel:', this.channel);
    // console.log('Current User:', this.currentUser);
    // console.log('Members:', this.members());
  }

  async loadChannel(): Promise<void> {
    const channels = await firstValueFrom(this.firestoreService.getChannels());
    const found = channels.find(c => c.channelId === this.channelId);

    if (found) {
      this.channel = found;
    }
  }

  async loadMembers(): Promise<void> {
    const users = await firstValueFrom(this.firestoreService.getUsers());

    const memberList = users.filter((user: appUser) =>
      this.channel?.members.includes(user.id!)
    );

    const sortedMembers = [...memberList].sort((a, b) => {
      if (a.id === this.currentUser?.id) return -1;
      if (b.id === this.currentUser?.id) return 1;
      return 0;
    });

    this.members.set(sortedMembers);
  }

  openAddPeopleDialog(): void {
  }
}
