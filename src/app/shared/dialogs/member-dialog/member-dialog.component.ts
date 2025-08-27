import { CommonModule } from '@angular/common';
import { Component, ElementRef, Inject, inject, signal, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { appUser } from '../../../interfaces/user.interface';
import { Channel } from '../../../interfaces/channel.interface';
import { SessionService } from '../../services/currentUserSession.service';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FirestoreService } from '../../services/firestore.service';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { ChannelsDirectMessageService } from '../../services/channels-direct-message.service';

@Component({
  selector: 'app-member-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatChipsModule,
    MatAutocompleteModule
  ],
  templateUrl: './member-dialog.component.html',
  styleUrl: './member-dialog.component.scss'
})
export class MemberDialogComponent {
  @ViewChild('inputField') inputField!: ElementRef<HTMLInputElement>;

  readonly firestoreService = inject(FirestoreService);
  readonly userSession = inject(SessionService);
  readonly dialog = inject(MatDialog);
  readonly announcer = inject(LiveAnnouncer);
  readonly channelsDirectMessageService = inject(ChannelsDirectMessageService);
  readonly peoples = signal<appUser[]>([]);
  readonly allUsers = signal<appUser[]>([]);
  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  readonly filteredUsers = signal<appUser[]>([]);
  channelMembers = signal<string[]>([]);
  members = signal<appUser[]>([]);

  searchTerm = '';
  channelId = '';
  channel: Channel | null = null;
  currentUser: appUser | null = null;
  autocompleteIsOpen = false
  isGastLogin = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { channelId: any; source: string; }, private dialogRef: MatDialogRef<MemberDialogComponent>) { }

  async ngOnInit(): Promise<void> {
    this.currentUser = this.userSession.getCurrentUser();
    if (this.currentUser?.id == "Guest") {
      this.isGastLogin = true;
    }
    this.channelId = this.data.channelId;
    console.log(this.currentUser?.id);

    await this.loadChannel();
    await this.loadMembers();
  }

  async loadChannel(): Promise<void> {
    const channels = await this.whichChannels();
    const found = channels.find(c => c.channelId === this.channelId);
    if (found) {
      this.channel = found;
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

  async loadMembers(): Promise<void> {
    const users = await this.whichUsers();
    this.allUsers.set(users)

    const memberList = users.filter((user: appUser) =>
      this.channel?.members.includes(user.id!)
    );

    const sortedMembers = [...memberList].sort((a, b) => {
      if (a.id === this.currentUser?.id) return -1;
      if (b.id === this.currentUser?.id) return 1;
      return 0;
    });

    this.members.set(sortedMembers);
    this.channelMembers.set(this.channel?.members ?? []);
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

  closeDialog(): void {
    this.dialogRef.close();
  }

  openAddPeopleDialog(): void {
    this.closeDialog();
    this.dialog.open(MemberDialogComponent, {
      position: { top: '190px', right: '45px' },
      width: '415px',
      maxHeight: '75vh',
      panelClass: 'member-dialog',
      data: {
        source: 'add-members',
        channelId: this.channel?.channelId
      }
    })
  }

  // Add-Members
  private tryAddFromSearchTerm(): void {
    const val = this.searchTerm.trim();
    if (!val) return;

    const match = this.allUsers().find(u => u.userName.toLowerCase() === val.toLowerCase());
    if (match && !this.peoples().some(p => p.userName === match.userName)) {
      this.peoples.update(peoples => [...peoples, match]);
    }

    this.searchTerm = '';
    this.filteredUsers.set(this.allUsers());

    setTimeout(() => this.inputField?.nativeElement.focus(), 0);
  }

  remove(people: appUser): void {
    this.peoples.update(peoples => peoples.filter(p => p !== people));
    this.announcer.announce(`Removed ${people.userName}`);
  }

  addFromText(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (!value) return;

    const match = this.allUsers().find(u => u.userName.toLowerCase() === value.toLowerCase());
    if (match && !this.peoples().some(p => p.userName === match.userName)) {
      this.peoples.update(peoples => [...peoples, match]);
    }

    this.searchTerm = '';
    this.filteredUsers.set(this.allUsers());
    event.chipInput?.clear();

    setTimeout(() => this.inputField?.nativeElement.focus(), 0);
  }

  onInputBlur(): void {
    setTimeout(() => this.tryAddFromSearchTerm(), 150);
  }

  autocompleteOpened(): void {
    this.autocompleteIsOpen = true;
  }

  autocompleteClosed(): void {
    this.autocompleteIsOpen = false;
    this.tryAddFromSearchTerm();
  }

  filterUsers(): void {
    const query = (this.searchTerm || '').toString().toLowerCase();
    const membersInChannel = this.channelMembers();
    this.filteredUsers.set(
      this.allUsers().filter(user =>
        user.userName.toLowerCase().startsWith(query) &&
        !this.peoples().some(p => p.userName === user.userName) &&
        !membersInChannel.includes(user.id!)
      )
    );
  }

  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = (target.value ?? '').toString();
    this.filterUsers();
  }

  selectUser(user: appUser): void {
    if (
      !this.peoples().some(p => p.userName === user.userName) &&
      !this.channelMembers().includes(user.id!)
    ) {
      this.peoples.update(peoples => [...peoples, user]);
    }

    this.searchTerm = '';
    this.filteredUsers.set(this.allUsers());

    if (this.inputField) {
      this.inputField.nativeElement.value = '';
      this.inputField.nativeElement.focus();
    }
  }

  async addMembers(): Promise<void> {
    if (this.isGastLogin) {
      this.addGuestMembers();
      return;
    }

    if (!this.currentUser) {
      console.error('Kein eingeloggter User gefunden.');
      return;
    }

    const membersToAdd = this.peoples().map(u => u.id!);
    try {
      await this.firestoreService.addMembersToChannel(this.data.channelId, membersToAdd);
      this.dialogRef.close({ membersAdded: true });
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Mitglieder:', error);
    }
  }

  addGuestMembers(): void {
    const ids = this.peoples().map(u => u.id!).filter(Boolean);
    const list = this.channelsDirectMessageService.getChannels();
    const i = list.findIndex(c => c.channelId === this.channelId);
    if (i === -1 || ids.length === 0) return;
    const updated = { ...list[i], members: Array.from(new Set([...(list[i].members ?? []), ...ids])) };
    list[i] = updated;
    this.channelsDirectMessageService.setSelectedGuestChannel(updated);
    this.dialogRef.close({ membersAdded: true });
  }
}