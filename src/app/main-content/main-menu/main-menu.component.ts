import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  OnInit,
  OnDestroy,
  Output,
  HostListener,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { onSnapshot } from 'firebase/firestore';
import { SearchService } from '../../shared/services/search.service';
import {
  ChannelsDirectMessageService,
  DirectMessage,
} from '../../shared/services/channels-direct-message.service';
import { FirestoreService } from '../../shared/services/firestore.service';
import { UserService } from '../../shared/services/user.services';
import { SessionService } from '../../shared/services/currentUserSession.service';
import { DirectMessageService } from '../../shared/services/direct-message.service';
import { AddChannelDialogComponent } from '../../shared/dialogs/add-channel-dialog/add-channel-dialog.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { appUser } from '../../interfaces/user.interface';
import { Channel } from '../../interfaces/channel.interface';

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
    HeaderComponent,
  ],
  templateUrl: './main-menu.component.html',
  styleUrls: [
    './main-menu.component.scss',
    './main-menu.media-query.component.scss',
  ],
})
export class MainMenuComponent implements OnInit, OnDestroy {
  // Event emitters for communication with parent components
  @Output() chatSelected = new EventEmitter<string>();
  @Output() chatTypeSelected = new EventEmitter<'channel' | 'conversation'>();
  @Output() newMessage = new EventEmitter<void>();
  @Output() closeNewMessage = new EventEmitter<void>();

  // Injected services
  readonly dialog = inject(MatDialog);
  readonly searchService = inject(SearchService);
  readonly channelDirectMessageData = inject(ChannelsDirectMessageService);
  readonly firestoreService = inject(FirestoreService);

  // UI & state flags
  gastLogin = false;
  showChannels = true;
  showDirectMessages = true;
  showNewMessage = false;
  wordBreak = false;
  currentLoginId = '';
  currentLoginEmail = '';
  searchTerm = '';
  width = window.innerWidth;
  isSmallScreen = this.width < 800;

  // Filtered data for search
  filteredChannels: any[] = [];
  filteredDirectMessages: any[] = [];
  filteredContentResults: Array<{
    channel: Channel;
    hits: Array<{ id: string; text: string; timestamp: any }>;
  }> = [];

  // Data storage
  channels: any[] = [];
  userChannels: any[] = [];
  users: any[] = [];
  currentUser: appUser | null = null;
  allDirectMessages: appUser[] = [];
  directMessages: any[] = [];
  unsubCurrentUser: any;

  constructor(
    private router: Router,
    private userService: UserService,
    private userSession: SessionService,
    private cdr: ChangeDetectorRef,
    private directMessageService: DirectMessageService
  ) {
    this.initializeUserFromNavigation();
  }

  // Angular OnInit lifecycle: setup user session and load channels/users
  ngOnInit(): void {
    this.initCurrentUserSession();
    this.loadChannelsAndUsers();
    this.handleResize();
  }

  // Angular OnDestroy lifecycle: unsubscribe from snapshot listeners
  ngOnDestroy(): void {
    this.unsubCurrentUser?.();
  }

  // Initializes the user based on router navigation state
  initializeUserFromNavigation(): void {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as {
      loginEmail: string;
      loginId: string;
    };
    if (!state) return;
    if (state.loginId === 'Guest') {
      this.gastLogin = true;
      this.loadGuestData();
      this.userSession.setCurrentUser(this.currentUser!);
    } else {
      this.loadUserData(state);
      this.unsubCurrentUser = this.subscribeToCurrentUser();
    }
  }

  // Listen to window resize events
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.handleResize();
    this.checkScreenSize();
  }

  // Switch routes based on screen width
  handleResize(): void {
    const wasSmallScreen = this.isSmallScreen;
    this.isSmallScreen = window.innerWidth < 800;

    if (this.isSmallScreen && !wasSmallScreen) {
      this.router.navigate(['/main-menu']);
    } else if (!this.isSmallScreen && wasSmallScreen) {
      this.router.navigate(['/main']);
    }
  }

  checkScreenSize(): void {
    this.wordBreak = this.width < 1740;
  }

  // Initializes the current user session and ensures self-conversation exists
  async initCurrentUserSession(): Promise<void> {
    const sessionUser = this.userSession.getCurrentUser();
    if (!this.gastLogin && sessionUser && !this.currentLoginId) {
      this.currentUser = sessionUser;
      this.currentLoginId = sessionUser.id!;
      this.currentLoginEmail = sessionUser.email!;
      this.subscribeToCurrentUser();
      this.directMessageService.setCurrentUser(this.currentUser);
      await this.directMessageService.ensureSelfConversationExists();
    }
    if (!this.gastLogin && this.currentLoginId) {
      await this.loadCurrentUserFromFirestore();
      this.searchService.setCurrentUserId(this.currentLoginId);
    }
  }

  // Loads login state into currentLoginId and currentLoginEmail
  loadUserData(state: { loginEmail: string; loginId: string }): void {
    this.currentLoginEmail = state.loginEmail ?? '';
    this.currentLoginId = state.loginId ?? '';
  }

  // Sets up guest user object
  loadGuestData(): void {
    this.currentUser = {
      id: 'Guest',
      userName: 'Frederik Beck',
      profilePic: 3,
      status: true,
      email: 'email@beispiel.com',
    };
  }

  // Loads the current user's data from Firestore
  async loadCurrentUserFromFirestore(): Promise<void> {
    this.userService.updateUserStatusTrue(this.currentLoginId);
    const userData = await firstValueFrom(
      this.firestoreService.getUserById(this.currentLoginId)
    );
    this.currentUser = this.userService.setUserObject(userData, userData?.id);
    this.userSession.setCurrentUser(this.currentUser);
  }

  // Subscribes to changes in the current user's Firestore document
  subscribeToCurrentUser() {
    const currentUserDocRef = this.firestoreService.getUserDocRef(
      this.currentLoginId
    );
    return onSnapshot(currentUserDocRef, (snapshot) => {
      const data = snapshot.data();
      if (!data) return;
      this.currentUser = this.userService.setUserObject(
        data,
        this.currentLoginId
      );
      this.loadAllUsers();
      this.cdr.detectChanges();
    });
  }

  // Loads all channels and users relevant for the current user
  loadChannelsAndUsers(): void {
    if (this.gastLogin) return;
    this.firestoreService.getChannels().subscribe((channels) => {
      this.channels = channels;
      this.userChannels = channels.filter((ch) =>
        ch.members.includes(this.currentLoginId)
      );
      this.searchService.setFirestoreChannels(channels);
    });
    this.loadAllUsers();
    this.firestoreService
      .getConversationsByUserId(this.currentLoginId)
      .subscribe((conv) => {
        this.directMessages = conv;
        this.filterDirectMessageUsers();
        this.searchService.setDirectMessagePartnerIds(
          this.directMessages,
          this.currentLoginId
        );
        this.updateFilteredResults();
      });
    this.updateFilteredResults();
  }

  // Loads all users from Firestore
  loadAllUsers(): void {
    this.firestoreService.getUsers().subscribe((users) => {
      this.users = users;
      this.searchService.setFirestoreUsers(users);
      if (!this.gastLogin) {
        this.filterDirectMessageUsers();
        this.searchService.setCurrentUserId(this.currentLoginId);
        this.searchService.setDirectMessagePartnerIds(
          this.directMessages,
          this.currentLoginId
        );
      }
    });
  }

  // Filters direct messages to exclude current user and set other participants
  filterDirectMessageUsers(): void {
    const otherUserIds = this.directMessages
      .map((conv) =>
        conv.participants.find((id: string) => id !== this.currentLoginId)
      )
      .filter(Boolean);
    this.allDirectMessages = this.users.filter((user) =>
      otherUserIds.includes(user.id)
    );
    if (
      this.currentUser &&
      !this.allDirectMessages.some((u) => u.id === this.currentUser?.id)
    ) {
      this.allDirectMessages.unshift(this.currentUser);
    }
  }

  // Checks if the search input has text
  get isSearchActive(): boolean {
    return this.searchTerm.trim().length > 0;
  }

  // Updates filtered search results for channels, direct messages, and content
  async updateFilteredResults(): Promise<void> {
    const { channels, directMessages, contentResults } =
      await this.searchService.updateFilteredResults(
        this.searchTerm,
        this.gastLogin,
        this.directMessages,
        this.currentLoginId
      );
    this.filteredChannels = channels;
    this.filteredDirectMessages = directMessages;
    this.filteredContentResults = contentResults;
  }

  // Closes the search UI and resets results
  closeSearch(): void {
    this.searchTerm = '';
    this.updateFilteredResults();
  }

  // Selects a channel and navigates or emits events
  selectChannel(channel: any): void {
    if (!channel?.channelId) {
      console.error('Channel oder channelId ist undefined:', channel);
      return;
    }
    this.channelDirectMessageData.setSelectedChannel(channel);
    this.closeNewMessage.emit();
    if (window.innerWidth < 800) {
      this.router.navigate(['/chat-container', 'channel', channel.channelId]);
    } else {
      this.chatSelected.emit(channel.channelId);
      this.chatTypeSelected.emit('channel');
    }
  }

  // Selects a direct message with a user
  selectDirectMessage(user: appUser): void {
    if (!user?.id || !this.currentUser?.id) {
      console.error(
        'User oder currentUser is undefined',
        user,
        this.currentUser
      );
      return;
    }
    const conversation = this.findConversationBetweenUsers(
      user.id,
      this.currentUser.id
    );
    if (!conversation?.id) {
      console.error('Keine passende Konversation gefunden für:', user);
      return;
    }
    this.channelDirectMessageData.setSelectedDirectMessage(user);
    this.closeNewMessage.emit();
    if (window.innerWidth < 800) {
      this.router.navigate([
        '/chat-container',
        'conversation',
        conversation.id,
      ]);
    } else {
      this.chatTypeSelected.emit('conversation');
      this.chatSelected.emit(conversation.id);
    }
  }

  // Finds a conversation between two users
  findConversationBetweenUsers(userId1: string, userId2: string): any | null {
    return (
      this.directMessages.find((conv) => {
        const participants: string[] = conv.members || conv.participants;
        const sortedParticipants = [...participants].sort();
        const sortedIds = [userId1, userId2].sort();
        return (
          sortedParticipants[0] === sortedIds[0] &&
          sortedParticipants[1] === sortedIds[1]
        );
      }) || null
    );
  }

  // Selects a direct message for guest users
  selectDirectMessageGast(user: DirectMessage): void {
    if (!user) return;
    this.channelDirectMessageData.setSelectedDirectMessageGast(user);
    this.closeNewMessage.emit();
    if (window.innerWidth < 800) {
      this.router.navigate([
        '/chat-container',
        'conversation',
        'guest',
        user.id,
      ]);
      this.chatTypeSelected.emit('conversation');
    }
  }

  // Selects a guest channel
  selectGuestChannel(channel: Channel): void {
    this.channelDirectMessageData.setSelectedGuestChannel(channel);
    this.closeNewMessage.emit();
    this.chatTypeSelected.emit('channel');
    if (window.innerWidth < 800 && channel.channelId) {
      this.router.navigate(['/chat-container', 'channel', channel.channelId]);
    }
  }

  // Opens the "new message" UI
  openNewMessage(): void {
    if (window.innerWidth < 800) {
      this.router.navigate(['/new-message', this.currentUser?.id]);
    } else {
      this.newMessage.emit();
    }
  }

  // Opens the "add channel" dialog or navigates
  addChannel(): void {
    if (window.innerWidth < 800) {
      this.router.navigate(['/addChannelDialog']);
    } else {
      this.dialog.open(AddChannelDialogComponent, {
        panelClass: 'middle-dialog-panel',
      });
    }
  }

  // Utility getter: checks if current user is guest
  get isGuestUser(): boolean {
    return this.currentUser?.id === 'Guest';
  }

  // Utility getter: sorts users with current user first
  get sortedUsers(): appUser[] {
    const currentUserId = this.currentUser?.id;
    if (!currentUserId) return this.users;
    return [
      ...this.users.filter((u) => u.id === currentUserId),
      ...this.users.filter((u) => u.id !== currentUserId),
    ];
  }
}
