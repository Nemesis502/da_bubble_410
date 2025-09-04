import {
  Component,
  Inject,
  inject,
  signal,
  OnInit,
  ViewChild,
  ElementRef,
  HostListener,
  Injectable,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { FormsModule } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ProfilDialogComponent } from '../../../shared/dialogs/profil-dialog/profil-dialog.component';
import { SessionService } from '../../../shared/services/currentUserSession.service';
import { appUser } from '../../../interfaces/user.interface';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { firstValueFrom } from 'rxjs';
import { FirestoreService } from '../../../shared/services/firestore.service';
import { ChannelsDirectMessageService } from '../../../shared/services/channels-direct-message.service';
import { Channel } from '../../../interfaces/channel.interface';
import { AccountService } from '../../services/account.service';

@Component({
  selector: 'app-menu-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatChipsModule,
    MatAutocompleteModule,
  ],
  templateUrl: './menu-dialog.component.html',
  styleUrls: [
    './menu-dialog.component.scss',
    './menu-dialog.media-query.component.scss',
  ],
})
export class MenuDialogComponent implements OnInit {
  @ViewChild('inputField') inputField!: ElementRef<HTMLInputElement>;

  readonly dialog = inject(MatDialog);
  readonly dialogRef = inject(MatDialogRef<MenuDialogComponent>);
  readonly firestoreService = inject(FirestoreService);
  readonly channelsDirectMessageService = inject(ChannelsDirectMessageService);
  readonly announcer = inject(LiveAnnouncer);

  readonly separatorKeysCodes = [ENTER, COMMA] as const;

  peoples = signal<appUser[]>([]);
  allUsers = signal<appUser[]>([]);
  filteredUsers = signal<appUser[]>([]);
  channelMembers = signal<string[]>([]);

  currentUser: appUser | null = null;
  channelId = '';
  channelName = '';
  channelDescription = '';
  searchTerm = '';
  isActive = true;
  isGastLogin = false;
  screenWidth = window.innerWidth;
  screenSmall = false;
  autocompleteIsOpen = false;

  constructor(
    private router: Router,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private userSession: SessionService,
    private account: AccountService
  ) {
    this.isGastLogin = !!data.gastLogin;
    this.currentUser = this.userSession.getCurrentUser();
  }

@HostListener('window:resize', ['$event'])
onResize(event: Event): void {
  this.screenWidth = (event.target as Window).innerWidth;
  const small = this.screenWidth < 800;
  if (small !== this.screenSmall) {
    this.screenSmall = small;  
    this.updateDialogPosition(small);
  }
}


ngOnInit(): void {
  this.screenWidth = window.innerWidth;
  this.screenSmall = this.screenWidth < 800;
  this.initDialogData();
  this.loadUsers();
}

  initDialogData(): void {
    if (this.data.source === 'add-channel') {
      this.channelName = this.data.channelName || '';
      this.channelDescription = this.data.channelDescription || '';
    }
    if (this.data.source === 'channel-info') {
      this.channelId = this.data.channelId;
      this.loadChannelMembers();
    }
  }

  updateDialogPosition(small: boolean): void {
    this.screenSmall = small;
    this.dialog.closeAll();
    const config = small
      ? {
          position: { bottom: '0' },
          width: '100vw',
          panelClass: 'bottom-dialog-panel',
        }
      : {
          position: { top: '80px', right: '16px' },
          maxWidth: '282px',
          maxHeight: '181px',
          panelClass: 'top-right-dialog-panel',
        };
    this.dialog.open(MenuDialogComponent, { ...config, data: this.data });
  }

  openProfileDialog(): void {
    this.closeDialog();
    this.dialog.open(ProfilDialogComponent, {
      maxWidth: '398px',
      maxHeight: '600px',
      panelClass: 'bottom-dialog-panel',
      data: {
        user: this.currentUser,
        loggedUser: this.currentUser?.id,
        isUser: true,
      },
    });
  }

  logout(): void {
    this.account.logoutAndMarkOffline(this.currentUser?.id!);
    this.closeDialog();
  }

  async createNewChannel(): Promise<void> {
    if (!this.currentUser && !this.isGastLogin)
      return console.error('Kein eingeloggter User.');
    const baseChannel = this.buildChannelData();
    this.isGastLogin
      ? this.addGuestChannel(baseChannel)
      : await this.uploadChannel(baseChannel);
  }

  buildChannelData(): Omit<Channel, 'channelId'> {
    return {
      name: this.channelName,
      description: this.channelDescription,
      createdBy: this.currentUser!.id!,
      members: Array.from(
        new Set([...this.peoples(), this.currentUser!].map((u) => u.id!))
      ),
      messages: [],
    };
  }

  addGuestChannel(baseChannel: Channel): void {
    this.channelsDirectMessageService.channels.push({
      ...baseChannel,
      channelId: 'sJuCZwfLcDL9vhADHGB0',
    });
    this.closeDialog();
  }

  async uploadChannel(baseChannel: Channel): Promise<void> {
    try {
      const docRef = await this.firestoreService.addChannel(baseChannel);
      await this.firestoreService.updateChannel(docRef.id, {
        channelId: docRef.id,
      });
      this.closeDialog();
      if (this.screenSmall) {
        this.router.navigate(['/main-menu']);
      } else {
        this.router.navigate(['/main']);
      }
    } catch (error) {
      console.error('Fehler beim Speichern des Channels:', error);
    }
  }

  async addMembers(): Promise<void> {
    if (this.isGastLogin || !this.currentUser) return;
    const membersToAdd = this.peoples().map((u) => u.id!);
    try {
      await this.firestoreService.addMembersToChannel(
        this.channelId,
        membersToAdd
      );
      this.dialogRef.close({ membersAdded: true });
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Mitglieder:', error);
    }
  }

  filterUsers(): void {
    const query = (typeof this.searchTerm === 'string' ? this.searchTerm : '')
      .toLowerCase()
      .trim();
    const membersInChannel = this.channelMembers();
    this.filteredUsers.set(
      this.allUsers().filter(
        (u) =>
          (u.userName ?? '').toLowerCase().startsWith(query) &&
          !this.peoples().some((p) => p.userName === u.userName) &&
          !membersInChannel.includes(u.id!)
      )
    );
  }

  selectUser(userName: string): void {
    const user = this.allUsers().find((u) => u.userName === userName);
    if (!user) return;

    if (
      !this.peoples().some((p) => p.userName === user.userName) &&
      !this.channelMembers().includes(user.id!)
    ) {
      this.peoples.update((p) => [...p, user]);
    }
    this.clearSearch();
  }

  addFromText(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (!value) return;
    const match = this.allUsers().find(
      (u) => u.userName.toLowerCase() === value.toLowerCase()
    );
    if (match) this.selectUser(match.userName);
    this.clearSearch();
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

  tryAddFromSearchTerm(): void {
    const val = (
      typeof this.searchTerm === 'string' ? this.searchTerm : ''
    ).trim();
    if (!val) return;
    const match = this.allUsers().find(
      (u) => (u.userName ?? '').toLowerCase() === val.toLowerCase()
    );
    if (match) this.selectUser(match.userName);
  }

  remove(people: appUser): void {
    this.peoples.update((p) => p.filter((u) => u !== people));
    this.announcer.announce(`Removed ${people.userName}`);
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  async loadUsers(): Promise<void> {
    if (this.isGastLogin) this.loadGuestUsers();
    else this.loadLiveUsers();
  }

  loadGuestUsers(): void {
    const users = this.channelsDirectMessageService
      .getDirectMessagesForGast()
      .map((dm) => ({
        id: dm.id,
        userName: dm.name,
        profilePic: parseInt(dm.img.replace('.png', ''), 10) || 0,
        status: dm.status === 'online',
        email: '',
      }));
    this.allUsers.set(users);
    this.filteredUsers.set(users);
  }

  async loadLiveUsers(): Promise<void> {
    const usersFromFirestore = await firstValueFrom(
      this.firestoreService.getUsers()
    );
    const users: appUser[] = usersFromFirestore.map((u: any) => ({
      id: u.id,
      userName: u.userName,
      profilePic: u.profilePic,
      status: u.status,
      email: u.email,
    }));
    this.allUsers.set(users);
    this.filteredUsers.set(users);
  }

  async loadChannelMembers(): Promise<void> {
    const channels = await firstValueFrom(this.firestoreService.getChannels());
    const channel = channels.find((c) => c.channelId === this.channelId);
    if (channel) this.channelMembers.set(channel.members);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filteredUsers.set(this.allUsers());
    if (this.inputField?.nativeElement) {
      this.inputField.nativeElement.value = '';
      setTimeout(() => this.inputField.nativeElement.focus(), 0);
    }
  }

  toggleActive(isActive: boolean): void {
    this.isActive = isActive;
    if (!isActive) this.clearSearch();
  }
}
