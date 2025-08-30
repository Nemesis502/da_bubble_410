import { Component, EventEmitter, inject, Input, OnChanges, Output, signal, SimpleChanges } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FirestoreService } from '../../shared/services/firestore.service';
import { updateDoc } from 'firebase/firestore';
import { Channel } from '../../interfaces/channel.interface';
import { appUser } from '../../interfaces/user.interface';
import { firstValueFrom } from 'rxjs';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatDialog } from '@angular/material/dialog';
import { SessionService } from '../../shared/services/currentUserSession.service';
import { MenuDialogComponent } from '../../shared/dialogs/menu-dialog/menu-dialog.component';
import { ChannelsDirectMessageService, DirectMessage } from '../../shared/services/channels-direct-message.service';

@Component({
  selector: 'app-channel-info',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    FormsModule,
    TextFieldModule
  ],
  templateUrl: './channel-info.component.html',
  styleUrls: ['./channel-info.component.scss'],
})
export class ChannelInfoComponent implements OnChanges {
  readonly firestoreService = inject(FirestoreService);
  readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  readonly document = inject(DOCUMENT);
  readonly dialog = inject(MatDialog);
  readonly userSession = inject(SessionService);
  readonly channelsDirectMessageService = inject(ChannelsDirectMessageService);

  @Input() channelId = '';
  @Output() closeChannelInfo = new EventEmitter<void>();

  channel: Channel | null = null;
  members = signal<appUser[]>([]);
  currentUser: appUser | null = null;
  isGastLogin = false;
  isMobile = window.innerWidth < 999;

  channelNameInput = '';
  newChannelName = '';
  channelDescriptionInput = '';
  newChannelDescription = '';
  creatorName = '';
  editName = false;
  editDescription = false;

  constructor() {
    this.currentUser = this.userSession.getCurrentUser();
    this.isGastLogin = this.currentUser?.id === 'Guest';
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['channelId'] && this.channelId) {
      await this.loadChannel();
      await this.loadMembers();
    }
  }

  async loadChannel(): Promise<void> {
    const channels = await this.getChannels();
    const found = channels.find(c => c.channelId === this.channelId);
    if (!found) return;

    this.channel = found;
    this.channelNameInput = found.name;
    this.channelDescriptionInput = found.description || '';
    await this.loadCreator(found.createdBy);
  }

  async getChannels(): Promise<Channel[]> {
    if (this.isGastLogin) return this.channelsDirectMessageService.getChannels();
    return await firstValueFrom(this.firestoreService.getChannels());
  }

  async loadCreator(userId: string) {
    if (!userId) return;
    const user = await this.getCreator(userId);
    this.creatorName = user?.userName ?? '';
  }

  async getCreator(userId: string): Promise<appUser | null> {
    if (!userId) return null;
    if (this.isGastLogin) {
      const dm = this.channelsDirectMessageService.getDirectMessagesForGast().find(u => u.id === userId || u.name === userId);
      return dm ? this.convertDmToAppUser(dm) : null;
    }
    return (await firstValueFrom(this.firestoreService.getUserById(userId))) as appUser;
  }

  convertDmToAppUser(dm: DirectMessage): appUser {
    return {
      id: dm.id,
      userName: dm.name,
      profilePic: parseInt(dm.img.replace('.png', ''), 10) || 0,
      status: dm.status === 'online',
      email: '',
    };
  }

  async loadMembers(): Promise<void> {
    const users = await this.getUsers();
    const memberList = users.filter(u => this.channel?.members.includes(u.id!));
    const sorted = memberList.sort((a, b) => (a.id === this.currentUser?.id ? -1 : b.id === this.currentUser?.id ? 1 : 0));
    this.members.set(sorted);
  }

  async getUsers(): Promise<appUser[]> {
    if (this.isGastLogin) return this.channelsDirectMessageService.getDirectMessagesForGast().map(this.convertDmToAppUser.bind(this));
    return await firstValueFrom(this.firestoreService.getUsers());
  }

  async saveName(): Promise<void> {
    if (!this.channelId || !this.newChannelName.trim()) return;
    this.channelNameInput = this.newChannelName.trim();
    await updateDoc(this.firestoreService.getChannelDocRef(this.channelId), { name: this.channelNameInput });
    this.editName = false;
    this.newChannelName = '';
    await this.loadChannel();
  }

  async saveDescription(): Promise<void> {
    if (!this.channelId || !this.newChannelDescription.trim()) return;
    this.channelDescriptionInput = this.newChannelDescription.trim();
    await updateDoc(this.firestoreService.getChannelDocRef(this.channelId), { description: this.channelDescriptionInput });
    this.editDescription = false;
    this.newChannelDescription = '';
    await this.loadChannel();
  }

  openAddPeopleDialog(): void {
    const dialogRef = this.dialog.open(MenuDialogComponent, {
      position: { bottom: '0' },
      maxWidth: '100vw',
      width: '100vw',
      height: '50vh',
      panelClass: 'bottom-dialog-panel',
      data: { source: 'channel-info', channelId: this.channelId, currentUser: this.currentUser },
    });

    dialogRef.afterClosed().subscribe(async () => {
      await this.loadChannel();
      await this.loadMembers();
    });
  }

  async leaveChannel(): Promise<void> {
    if (!this.channel || !this.currentUser?.id) return;
    const updatedMembers = this.channel.members.filter(id => id !== this.currentUser!.id);
    await updateDoc(this.firestoreService.getChannelDocRef(this.channelId), { members: updatedMembers });
    this.router.navigate(['/main']);
    this.close();
  }

  close(): void {
    this.closeChannelInfo.emit();
  }
}