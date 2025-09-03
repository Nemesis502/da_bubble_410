import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  Inject,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { appUser } from '../../../interfaces/user.interface';
import { Channel } from '../../../interfaces/channel.interface';
import { SessionService } from '../../services/currentUserSession.service';
import { FirestoreService } from '../../services/firestore.service';
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
    MatAutocompleteModule,
  ],
  templateUrl: './member-dialog.component.html',
  styleUrls: ['./member-dialog.component.scss'],
})
export class MemberDialogComponent {
  @ViewChild('inputField') inputField!: ElementRef<HTMLInputElement>;

  // Services
  readonly firestore = inject(FirestoreService);
  readonly session = inject(SessionService);
  readonly dialog = inject(MatDialog);
  readonly announcer = inject(LiveAnnouncer);
  readonly channelDmService = inject(ChannelsDirectMessageService);

  // State
  readonly allUsers = signal<appUser[]>([]);
  readonly selectedUsers = signal<appUser[]>([]);
  readonly filteredUsers = signal<appUser[]>([]);
  readonly channelMembers = signal<string[]>([]);
  readonly members = signal<appUser[]>([]);

  separatorKeysCodes = [ENTER, COMMA] as const;
  searchTerm = '';
  channelId = '';
  channel: Channel | null = null;
  currentUser: appUser | null = null;
  isGuestLogin = false;
  autocompleteIsOpen = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { channelId: string; source: string },
    private dialogRef: MatDialogRef<MemberDialogComponent>
  ) {}

  async ngOnInit(): Promise<void> {
    this.initSession();
    await this.loadChannel();
    await this.loadMembers();
  }

  // --- Session & Channel ---
  initSession(): void {
    this.currentUser = this.session.getCurrentUser();
    this.isGuestLogin = this.currentUser?.id === 'Guest';
    this.channelId = this.data.channelId;
  }

  async loadChannel(): Promise<void> {
    const channels = await this.getChannels();
    this.channel = channels.find((c) => c.channelId === this.channelId) ?? null;
  }

  async getChannels(): Promise<Channel[]> {
    return this.isGuestLogin
      ? this.channelDmService.getChannels()
      : await firstValueFrom(this.firestore.getChannels());
  }

  // --- User Handling ---
  async loadMembers(): Promise<void> {
    const users = await this.getUsers();
    this.allUsers.set(users);
    this.members.set(this.sortMembers(users));
    this.channelMembers.set(this.channel?.members ?? []);
  }

  async getUsers(): Promise<appUser[]> {
    if (this.isGuestLogin) {
      return this.channelDmService.getDirectMessagesForGast().map((dm) => ({
        id: dm.id,
        userName: dm.name,
        profilePic: parseInt(dm.img.replace('.png', ''), 10) || 0,
        status: dm.status === 'online',
        email: '',
      }));
    }
    return await firstValueFrom(this.firestore.getUsers());
  }

  sortMembers(users: appUser[]): appUser[] {
    return users
      .filter((u) => this.channel?.members.includes(u.id!))
      .sort((a, b) =>
        a.id === this.currentUser?.id
          ? -1
          : b.id === this.currentUser?.id
          ? 1
          : 0
      );
  }

  // --- Dialog Actions ---
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
      data: { source: 'add-members', channelId: this.channelId },
    });
  }

  // --- Member Selection ---
  addUserToSelection(user: appUser): void {
    if (
      !this.selectedUsers().some((u) => u.userName === user.userName) &&
      !this.channelMembers().includes(user.id!)
    ) {
      this.selectedUsers.update((list) => [...list, user]);
    }
  }

  remove(user: appUser): void {
    this.selectedUsers.update((list) => list.filter((u) => u !== user));
    this.announcer.announce(`Removed ${user.userName}`);
  }

  handleChipInput(value: string): void {
    const match = this.findUserByName(value);
    if (match) this.addUserToSelection(match);
    this.resetSearch();
  }

  findUserByName(name: string): appUser | undefined {
    const searchName = (name ?? '').toLowerCase();
    return this.allUsers().find(
      (u) => (u.userName ?? '').toLowerCase() === searchName
    );
  }

  resetSearch(): void {
    this.searchTerm = '';
    this.filteredUsers.set(this.allUsers());
    this.inputField?.nativeElement.focus();
  }

  // --- Autocomplete & Filtering ---
  onInputChange(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement)?.value ?? '';
    this.filterUsers();
  }

  filterUsers(): void {
    const query = (
      typeof this.searchTerm === 'string' ? this.searchTerm : ''
    ).toLowerCase();
    const selected = this.selectedUsers().map((u) => u.userName);
    const members = this.channelMembers();

    const filtered = this.allUsers().filter(
      (u) =>
        (u.userName ?? '').toLowerCase().startsWith(query) &&
        !selected.includes(u.userName) &&
        !members.includes(u.id!)
    );

    this.filteredUsers.set(filtered);
  }

  selectUser(userName: string): void {
    const user = this.allUsers().find((u) => u.userName === userName);
    if (!user) return;
    this.addUserToSelection(user);
    this.resetSearch();
    if (this.inputField?.nativeElement)
      this.inputField.nativeElement.value = '';
  }

  // --- Save Members ---
  async addMembers(): Promise<void> {
    if (this.selectedUsers().length === 0) return;
    this.isGuestLogin
      ? this.addGuestMembers()
      : await this.addFirestoreMembers();
  }

  async addFirestoreMembers(): Promise<void> {
    if (!this.currentUser) return;
    const ids = this.selectedUsers()
      .map((u) => u.id!)
      .filter(Boolean);
    try {
      await this.firestore.addMembersToChannel(this.channelId, ids);
      this.updateChannelMembers(ids);
      this.dialogRef.close({ membersAdded: true });
    } catch (e) {
      console.error('Fehler beim Hinzufügen der Mitglieder:', e);
    }
  }

  addGuestMembers(): void {
    const ids = this.selectedUsers()
      .map((u) => u.id!)
      .filter(Boolean);
    const channels = this.channelDmService.getChannels();
    const index = channels.findIndex((c) => c.channelId === this.channelId);
    if (index === -1 || ids.length === 0) return;

    const updated = {
      ...channels[index],
      members: [...new Set([...(channels[index].members ?? []), ...ids])],
    };
    channels[index] = updated;
    this.channelDmService.setSelectedGuestChannel(updated);
    this.dialogRef.close({ membersAdded: true });
    if (this.channel) {
      this.channelDmService.setSelectedGuestChannel(this.channel);
    }
  }

  updateChannelMembers(ids: string[]): void {
    if (!this.channel) return;
    const updated: Channel = {
      ...this.channel,
      members: [...new Set([...(this.channel.members ?? []), ...ids])],
    };
    this.channelDmService.setSelectedGuestChannel(updated);
  }
}
