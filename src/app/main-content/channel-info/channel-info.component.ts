import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, Renderer2, signal, SimpleChanges } from '@angular/core';
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
  styleUrl: './channel-info.component.scss',
})
export class ChannelInfoComponent implements OnChanges {
  readonly firestoreService = inject(FirestoreService);
  readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  readonly document = inject(DOCUMENT);
  readonly dialog = inject(MatDialog);
  readonly userSession = inject(SessionService);
  readonly channelsDirectMessageService = inject(ChannelsDirectMessageService);
  @Input() channelId: string = '';
  channel: Channel | null = null;
  members = signal<appUser[]>([]);
  currentUser: appUser | null = null;

  creatorName = '';
  channelNameInput = '';
  newChannelName = '';
  channelDescriptionInput = '';
  newChannelDescription = '';
  isMobile: boolean = false;
  editName = false;
  editDescription = false;
  width: number = window.innerWidth;
  isGastLogin: boolean = false;

  constructor(private renderer: Renderer2) {
    this.currentUser = this.userSession.getCurrentUser();
    if (this.currentUser?.id == "Guest") {
      this.isGastLogin = true;
    }
    this.isMobile = this.width < 999;
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['channelId'] && this.channelId) {
      await this.loadChannel();
      await this.loadMembers();
    }
  }

  @Output() closeChannelInfo = new EventEmitter<string>();

  async loadChannel(): Promise<void> {
    const channels = await this.whichChannels();
    const found = channels.find(c => c.channelId === this.channelId);

    if (found) {
      this.channel = found;
      this.channelNameInput = found.name;
      this.channelDescriptionInput = found.description || '';
      await this.loadCreator(found.createdBy);
    }
  }

  async whichChannels() {
    if (this.isGastLogin) {
      const guestChannels = this.channelsDirectMessageService.getChannels();
      return guestChannels;
    } else {
      const liveChannels = await firstValueFrom(this.firestoreService.getChannels());
      return liveChannels;
    }
  }

  async loadCreator(userId: string): Promise<void> {
    if (!userId) return;
    const user = await this.foundWhichCreator(userId);
    this.creatorName = user?.userName ?? '';
  }

  async foundWhichCreator(createdBy: string): Promise<appUser | null> {
    if (!createdBy) return null;
    if (this.isGastLogin) {
      const dm = this.findGuest(createdBy);
      return dm ? this.convertDmToAppUser(dm) : null;
    }
    const live = await firstValueFrom(this.firestoreService.getUserById(createdBy));
    return (live as appUser) ?? null;
  }

  findGuest(createdBy: string): DirectMessage | null {
    return this.channelsDirectMessageService.getDirectMessagesForGast()
      .find(u => u.id === createdBy || u.name === createdBy) ?? null;
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
    const users = await this.whichUsers();
    // const users = await firstValueFrom(this.firestoreService.getUsers());

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

  async whichUsers() {
    if (this.isGastLogin) {
      let guestUser = this.channelsDirectMessageService
        .getDirectMessagesForGast()
        .map((dm) => ({
          id: dm.id,
          userName: dm.name,
          profilePic: parseInt(dm.img.replace('.png', ''), 10) || 0,
          status: dm.status === 'online',
          email: '',
        }));
      return guestUser;
    } else {
      let liveUsers = await firstValueFrom(this.firestoreService.getUsers());
      return liveUsers;
    }
  }

  async saveName(): Promise<void> {
    if (!this.channelId || !this.newChannelName?.trim()) return;

    const ref = this.firestoreService.getChannelDocRef(this.channelId);
    this.channelNameInput = this.newChannelName.trim();
    await updateDoc(ref, { name: this.channelNameInput });
    this.editName = false;
    this.newChannelName = '';
    await this.loadChannel();
  }

  async saveDescription(): Promise<void> {
    if (!this.channelId || !this.newChannelDescription?.trim()) return;

    const ref = this.firestoreService.getChannelDocRef(this.channelId);
    this.channelDescriptionInput = this.newChannelDescription.trim();
    await updateDoc(ref, { description: this.channelDescriptionInput });
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
      data: {
        source: 'channel-info',
        channelId: this.channelId,
        currentUser: this.currentUser
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      await this.loadChannel();
      await this.loadMembers();
    });
  }


  async leaveChannel(): Promise<void> {
    if (!this.channel || !this.currentUser?.id) return;
    const updatedMembers = this.channel.members.filter(id => id !== this.currentUser!.id);
    const ref = this.firestoreService.getChannelDocRef(this.channelId);
    await updateDoc(ref, { members: updatedMembers });
    this.router.navigate(['/main']);
  }

  close(): void {
    this.closeChannelInfo.emit()
  }
}
