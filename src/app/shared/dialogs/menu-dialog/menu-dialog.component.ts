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
import { CommonModule, DOCUMENT } from '@angular/common';
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
import { AuthService } from '../../../shared/services/auth.service';
import { SessionService } from '../../../shared/services/currentUserSession.service';
import { appUser } from '../../../interfaces/user.interface';
import { UserService } from '../../../shared/services/user.services';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { firstValueFrom } from 'rxjs';
import { FirestoreService } from '../../../shared/services/firestore.service';
import { ChannelsDirectMessageService } from '../../../shared/services/channels-direct-message.service';
import { Channel } from '../../../interfaces/channel.interface';
import { AccountService } from '../../services/account.service';
// @Injectable({ providedIn: 'root' })
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
  styleUrls: ['./menu-dialog.component.scss', './menu-dialog.media-query.component.scss'],
})

export class MenuDialogComponent implements OnInit {
  @ViewChild('inputField') inputField!: ElementRef<HTMLInputElement>;

  // readonly Injects
  readonly dialog = inject(MatDialog);
  readonly document = inject(DOCUMENT);
  readonly dialogRef = inject(MatDialogRef<MenuDialogComponent>);
  readonly authService = inject(AuthService);
  readonly announcer = inject(LiveAnnouncer);
  readonly firestoreService = inject(FirestoreService);
  readonly channelsDirectMessageService = inject(ChannelsDirectMessageService);

  // Signale & States
  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  readonly peoples = signal<appUser[]>([]);
  readonly allUsers = signal<appUser[]>([]);
  readonly filteredUsers = signal<appUser[]>([]);
  channelMembers = signal<string[]>([]);

  // Allgemeine Variablen
  currentUser: appUser | null = null;
  channelId: string = '';
  searchTerm = '';
  channelName = '';
  channelDescription = '';
  isActive = true;
  isProfilHovered = false;
  autocompleteIsOpen = false;
  isGastLogin = false;
  screenWidth = window.innerWidth;
  screeenSmall = false;

  constructor(
    private router: Router,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      channelId: any;
      source: string;
      channelName?: string;
      channelDescription?: string;
      gastLogin?: boolean;
    },
    private userService: UserService,
    private userSession: SessionService,
    private account: AccountService
  ) {
    this.isGastLogin = this.data.gastLogin!;
    this.currentUser = this.userSession.getCurrentUser();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.screenWidth = (event.target as Window).innerWidth;
    if (this.screenWidth < 800 && this.screeenSmall === false) {
      this.screeenSmall = true;
      this.dialog.closeAll();
      this.dialog.open(MenuDialogComponent, {
        position: { bottom: '0' },
        maxWidth: '100vw',
        width: '100vw',
        panelClass: 'bottom-dialog-panel',
        data: this.data
      });
    } if (this.screenWidth >= 800 && this.screeenSmall === true) {
      this.screeenSmall = false;
      this.dialog.closeAll();
      this.dialog.open(MenuDialogComponent, {
        position: { top: '80px', right: '16px' },
        maxWidth: '282px',
        maxHeight: '181px',
        panelClass: 'top-right-dialog-panel',
        data: this.data
      });
    }
  }

  async ngOnInit(): Promise<void> {
    await this.loadUsers();

    if (this.data.source === 'add-channel') {
      this.channelName = this.data.channelName || '';
      this.channelDescription = this.data.channelDescription || '';
    }

    if (this.data.source === 'channel-info') {
      this.channelId = this.data.channelId;
      await this.loadChannelMembers();
    }
  }

  // Main-Menu
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
    // if (this.currentUser?.id === 'Guest') {
    //   this.router.navigate(['/']);
    //   this.closeDialog();
    // } else {
    //   this.account.logoutAndMarkOffline(this.currentUser?.id!)
    //   this.closeDialog();
    // }
    this.account.logoutAndMarkOffline(this.currentUser?.id!)
    this.closeDialog();
  }

  // Add-Channel
  async createNewChannel(): Promise<void> {
    if (this.isGastLogin) {
      console.log('Gast-Login: Channel wird nicht gespeichert.');
      return;
    }

    if (!this.currentUser) {
      console.error('Kein eingeloggter User gefunden.');
      return;
    }

    if (this.isActive) {
      this.peoples.set(this.allUsers());
    }

    const baseChannel: Omit<Channel, 'channelId'> = {
      name: this.channelName,
      description: this.channelDescription,
      createdBy: this.currentUser.id!,
      members: Array.from(
        new Set([...this.peoples().map((u) => u.id!), this.currentUser.id!])
      ),
      messages: [],
    };

    try {
      const docRef = await this.firestoreService.addChannel(baseChannel);
      await this.firestoreService.updateChannel(docRef.id, {
        channelId: docRef.id,
      });
      this.closeDialog();
      this.router.navigate(['/main']);
    } catch (error) {
      console.error('Fehler beim Speichern des Channels:', error);
    }
  }

  // Channel-Info
  async addMembers(): Promise<void> {
    if (this.isGastLogin) {
      console.log('Gast-Login: Mitglieder werden nicht hinzugefügt.');
      return;
    }

    if (!this.currentUser) {
      console.error('Kein eingeloggter User gefunden.');
      return;
    }

    const membersToAdd = this.peoples().map((u) => u.id!);
    try {
      await this.firestoreService.addMembersToChannel(
        this.data.channelId,
        membersToAdd
      );
      this.dialogRef.close({ membersAdded: true });
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Mitglieder:', error);
    }
  }

  // Gemeinsame Funktionen
  toggleActive(isActive: boolean): void {
    this.isActive = isActive;
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  private async loadUsers(): Promise<void> {
    if (this.isGastLogin) {
      const guestUsers = this.channelsDirectMessageService
        .getDirectMessagesForGast()
        .map((dm) => ({
          userName: dm.name,
          profilePic: parseInt(dm.img.replace('.png', ''), 10) || 0,
          status: dm.status === 'online',
          email: '',
        }));
      this.allUsers.set(guestUsers);
      this.filteredUsers.set(guestUsers);
    } else {
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
  }

  private async loadChannelMembers(): Promise<void> {
    const channels = await firstValueFrom(this.firestoreService.getChannels());
    const channel = channels.find((c) => c.channelId === this.channelId);
    if (channel) {
      this.channelMembers.set(channel.members);
    }
  }

  filterUsers(): void {
    const query = this.searchTerm.toLowerCase();
    const membersInChannel = this.channelMembers();

    this.filteredUsers.set(
      this.allUsers().filter(
        (user) =>
          user.userName.toLowerCase().startsWith(query) &&
          !this.peoples().some((p) => p.userName === user.userName) &&
          !membersInChannel.includes(user.id!)
      )
    );
  }

  selectUser(user: appUser): void {
    if (
      !this.peoples().some((p) => p.userName === user.userName) &&
      !this.channelMembers().includes(user.id!)
    ) {
      this.peoples.update((peoples) => [...peoples, user]);
    }

    this.searchTerm = '';
    this.filteredUsers.set(this.allUsers());

    setTimeout(() => this.inputField?.nativeElement.focus(), 0);
  }

  addFromText(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (!value) return;

    const match = this.allUsers().find(
      (u) => u.userName.toLowerCase() === value.toLowerCase()
    );
    if (match && !this.peoples().some((p) => p.userName === match.userName)) {
      this.peoples.update((peoples) => [...peoples, match]);
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

  private tryAddFromSearchTerm(): void {
    const val = this.searchTerm.trim();
    if (!val) return;

    const match = this.allUsers().find(
      (u) => u.userName.toLowerCase() === val.toLowerCase()
    );
    if (match && !this.peoples().some((p) => p.userName === match.userName)) {
      this.peoples.update((peoples) => [...peoples, match]);
    }

    this.searchTerm = '';
    this.filteredUsers.set(this.allUsers());

    setTimeout(() => this.inputField?.nativeElement.focus(), 0);
  }

  remove(people: appUser): void {
    this.peoples.update((peoples) => peoples.filter((p) => p !== people));
    this.announcer.announce(`Removed ${people.userName}`);
  }
}
