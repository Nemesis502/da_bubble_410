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
import { MenuDialogComponent } from '../menu-dialog/menu-dialog.component';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { COMMA, ENTER } from '@angular/cdk/keycodes';

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
  autocompleteIsOpen = false;
  isGastLogin = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { channelId: any; source: string; }, private dialogRef: MatDialogRef<MemberDialogComponent>) { }

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

    this.allUsers.set(users);

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

  closeDialog(): void {
    this.dialogRef.close();
  }

  openAddPeopleDialog(): void {
    this.closeDialog();
    this.dialog.open(MemberDialogComponent, {
      position: { top: '122px' },
      width: '80vw',
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
    const query = this.searchTerm.toLowerCase();
    const membersInChannel = this.channelMembers();

    this.filteredUsers.set(
      this.allUsers().filter(user =>
        user.userName.toLowerCase().startsWith(query) &&
        !this.peoples().some(p => p.userName === user.userName) &&
        !membersInChannel.includes(user.id!)
      )
    );
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

    setTimeout(() => this.inputField?.nativeElement.focus(), 0);
  }

  async addMembers(): Promise<void> {
    if (this.isGastLogin) {
      console.log('Gast-Login: Mitglieder werden nicht hinzugefügt.');
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
}