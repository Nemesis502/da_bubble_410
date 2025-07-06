import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { MenuDialogComponent } from './menu-dialog/menu-dialog.component';
import { SearchService } from '../../shared/services/search.service';
import { ChannelsDirectMessageService } from '../../shared/services/channels-direct-message.service';
import { FirestoreService } from '../../shared/services/firestore.service';
import { Router } from '@angular/router';
import { UserService } from '../../shared/services/user.services';
import { appUser } from '../../interfaces/user.interface';
import { firstValueFrom } from 'rxjs';
import { SessionService } from '../../shared/services/currentUserSession.service';
import { onSnapshot } from 'firebase/firestore';

@Component({
  selector: 'app-main-menu',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatDividerModule,
  ],
  templateUrl: './main-menu.component.html',
  styleUrl: './main-menu.component.scss',
})
export class MainMenuComponent implements OnInit {
  readonly dialog = inject(MatDialog);
  readonly searchService = inject(SearchService);
  readonly channelDirectMessageData = inject(ChannelsDirectMessageService);
  readonly firestoreService = inject(FirestoreService);

  gastLogin = false;

  showChannels = true;
  showDirectMessages = true;

  currentLoginId = '';
  currentLoginEmail = '';

  searchTerm = '';
  filteredChannels: any[] = [];
  filteredDirectMessages: any[] = [];

  channels: any[] = [];
  userChannels: any[] = [];
  users: any[] = [];
  currentUser: appUser | null = null;
  directMessages: any[] = [];
  unsubCurrentUser;

  constructor(private router: Router, private userService: UserService, private userSession: SessionService, private cdr: ChangeDetectorRef) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as {
      loginEmail: string;
      loginId: string;
    };
    if (state) {
      if (state.loginId == "Guest") {
        this.gastLogin = true;
        this.loadGuestData()
        this.userSession.setCurrentUser(this.currentUser!);
      } else {
        this.loadUserData(state);
        this.unsubCurrentUser = this.subCurrentUser();
      }
    }
  }

  async ngOnInit(): Promise<void> {
    const sessionUser = this.userSession.getCurrentUser();

    if (!this.gastLogin && sessionUser && !this.currentLoginId) {
      this.currentUser = sessionUser;
      this.currentLoginId = sessionUser.id!;
      this.currentLoginEmail = sessionUser.email!;
      this.subCurrentUser();
    }

    if (!this.gastLogin && this.currentLoginId) {
      await this.getCurrentUserLogIn();
      console.log('current User', this.currentUser);
    }

    if (!this.gastLogin) {
      this.firestoreService.getChannels().subscribe((c) => {
        this.channels = c;
        this.userChannels = c.filter(channel =>
          channel.members.includes(this.currentLoginId)
        );
        this.searchService.setFirestoreChannels(c);
      });

      this.getAllUsers();

      this.firestoreService.getConversations().subscribe((conv) => {
        this.directMessages = conv;
      });
    }

    this.updateFilteredResults();
  }

  loadUserData(state: { loginEmail: string; loginId: string }) {
    this.currentLoginEmail = state.loginEmail ?? '';
    this.currentLoginId = state.loginId ?? '';
  }

  async getCurrentUserLogIn() {
    this.userService.updateUserStatusTrue(this.currentLoginId);
    let userData = await firstValueFrom(this.firestoreService.getUserById(this.currentLoginId));
    this.currentUser = this.userService.setUserObject(userData, userData?.id);
    this.userSession.setCurrentUser(this.currentUser);
  }

  subCurrentUser() {
    let currenUserDocRef = this.firestoreService.getUserDocRef(this.currentLoginId)

    return onSnapshot(currenUserDocRef, (currentUserData) => {
      let userData = currentUserData.data();
      if (userData) {
        let user = this.userService.setUserObject(userData, this.currentLoginId);
        this.userSession.setCurrentUser(user);
        this.currentUser = user;
        this.getAllUsers();
        this.cdr.detectChanges();
      }
    })
  }

  loadGuestData() {
    let guestData = {
      id: 'Guest',
      userName: "Frederik Beck",
      profilePic: 3,
      status: true,
      email: "email@beispiel.com"
    }
    this.currentUser = guestData;
  }

  ngOnDestroy() {
    if (this.unsubCurrentUser) {
      this.unsubCurrentUser();
    }
  }

  get isSearchActive(): boolean {
    return this.searchTerm.trim().length > 0;
  }

  getAllUsers() {
    this.firestoreService.getUsers().subscribe((u) => {
      this.users = u;
      this.searchService.setFirestoreUsers(u);
    });
  }

  updateFilteredResults(): void {
    const term = this.searchTerm.trim().toLowerCase();
    const isChannelSearch = term.startsWith('#');
    const isDirectSearch = term.startsWith('@');
    const query = term.replace(/^[@#]/, '');

    if (this.gastLogin) {
      this.filterAsGuest(query, isChannelSearch, isDirectSearch);
    } else {
      this.filterAsUser(query, isChannelSearch, isDirectSearch);
    }
  }

  get sortedUsers(): appUser[] {
    if (!this.currentUser) return this.users;
    return [
      ...this.users.filter(u => u.id === this.currentUser?.id),
      ...this.users.filter(u => u.id !== this.currentUser?.id)
    ];
  }

  private filterAsGuest(
    query: string,
    isChannel: boolean,
    isDirect: boolean
  ): void {
    if (isChannel) {
      this.filteredChannels = this.channelDirectMessageData
        .getChannels()
        .filter((c) => c.name.toLowerCase().startsWith(query));
      this.filteredDirectMessages = [];
    } else if (isDirect) {
      this.filteredDirectMessages = this.channelDirectMessageData
        .getDirectMessagesForGast()
        .filter((dm) => dm.name.toLowerCase().startsWith(query));
      this.filteredChannels = [];
    } else {
      this.filteredChannels = this.channelDirectMessageData
        .getChannels()
        .filter((c) => c.name.toLowerCase().startsWith(query));
      this.filteredDirectMessages = this.channelDirectMessageData
        .getDirectMessagesForGast()
        .filter((dm) => dm.name.toLowerCase().startsWith(query));
    }
  }

  private filterAsUser(
    query: string,
    isChannel: boolean,
    isDirect: boolean
  ): void {
    if (isChannel) {
      this.filteredChannels = this.searchService
        .filterFirestoreChannels(query)
        .map((c) => c.name)
        .filter((c) => c.toLowerCase().startsWith(query));
      this.filteredDirectMessages = [];
    } else if (isDirect) {
      this.filteredDirectMessages = this.searchService
        .filterFirestoreDirectMessages(query)
        .filter((u) => u.userName.toLowerCase().startsWith(query));
      this.filteredChannels = [];
    } else {
      this.filteredChannels = this.searchService
        .filterFirestoreChannels(query)
        .map((c) => c.name)
        .filter((c) => c.toLowerCase().startsWith(query));

      this.filteredDirectMessages = this.searchService
        .filterFirestoreDirectMessages(query)
        .filter((u) => u.userName.toLowerCase().startsWith(query));
    }
  }

  closeSearch(): void {
    this.searchTerm = '';
    this.updateFilteredResults();
  }

  openMenuDialog(): void {
    this.dialog.open(MenuDialogComponent, {
      position: { bottom: '0' },
      maxWidth: '100vw',
      width: '100vw',
      panelClass: 'bottom-dialog-panel',
      data: {
        source: 'main-menu',
      },
    });
  }

  addChannel() {
    this.router.navigate(['/addChannelDialog']);
  }

  selectChannel(channel: any): void {
    this.channelDirectMessageData.setSelectedChannel(channel);
    this.router.navigate(['/chat', channel.channelId]);
  }
}