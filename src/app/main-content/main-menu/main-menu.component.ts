import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  OnInit,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { SearchService } from '../../shared/services/search.service';
import {
  ChannelsDirectMessageService,
  DirectMessage,
} from '../../shared/services/channels-direct-message.service';
import { FirestoreService } from '../../shared/services/firestore.service';
import { Router } from '@angular/router';
import { UserService } from '../../shared/services/user.services';
import { appUser } from '../../interfaces/user.interface';
import { firstValueFrom } from 'rxjs';
import { SessionService } from '../../shared/services/currentUserSession.service';
import { onSnapshot } from 'firebase/firestore';
import { DirectMessageService } from '../../shared/services/direct-message.service';
import { AddChannelDialogComponent } from '../../shared/dialogs/add-channel-dialog/add-channel-dialog.component';
import { HeaderComponent } from '../../shared/header/header.component';
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
export class MainMenuComponent implements OnInit {
  @Output() chatSelected = new EventEmitter<string>();
  @Output() chatTypeSelected = new EventEmitter<'channel' | 'conversation'>();
  @Output() newMessage = new EventEmitter<void>();
  @Output() closeNewMessage = new EventEmitter<void>();
  
  readonly dialog = inject(MatDialog);
  readonly searchService = inject(SearchService);
  readonly channelDirectMessageData = inject(ChannelsDirectMessageService);
  readonly firestoreService = inject(FirestoreService);

  gastLogin = false;
  showChannels = true;
  showDirectMessages = true;
  showNewMessage: boolean = false;
  currentLoginId = '';
  currentLoginEmail = '';
  searchTerm = '';
  isSmallScreen = window.innerWidth < 800;
  filteredChannels: any[] = [];
  filteredDirectMessages: any[] = [];
  filteredContentResults: Array<{
    channel: Channel;
    hits: Array<{ id: string; text: string; timestamp: any }>;
  }> = [];
  channels: any[] = [];
  userChannels: any[] = [];
  users: any[] = [];
  currentUser: appUser | null = null;
  allDirectMessages: appUser[] = [];
  directMessages: any[] = [];
  unsubCurrentUser;

  constructor(
    private router: Router,
    private userService: UserService,
    private userSession: SessionService,
    private cdr: ChangeDetectorRef,
    private directMessageService: DirectMessageService
  ) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as {
      loginEmail: string;
      loginId: string;
    };
    if (state) {
      if (state.loginId == 'Guest') {
        this.gastLogin = true;
        this.loadGuestData();
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
      this.directMessageService.setCurrentUser(this.currentUser);

      await this.directMessageService.ensureSelfConversationExists();
    }

    if (!this.gastLogin && this.currentLoginId) {
      await this.getCurrentUserLogIn();
      this.searchService.setCurrentUserId(this.currentLoginId);
    }

    if (!this.gastLogin) {
      this.firestoreService.getChannels().subscribe((c) => {
        this.channels = c;
        this.userChannels = c.filter((channel) =>
          channel.members.includes(this.currentLoginId)
        );
        this.searchService.setFirestoreChannels(c);
      });

      this.getAllUsers();

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
    }

    this.updateFilteredResults();
  }

  loadUserData(state: { loginEmail: string; loginId: string }) {
    this.currentLoginEmail = state.loginEmail ?? '';
    this.currentLoginId = state.loginId ?? '';
  }

  get isGuestUser(): boolean {
    return this.currentUser?.id === 'Guest';
  }

  async getCurrentUserLogIn() {
    this.userService.updateUserStatusTrue(this.currentLoginId);
    let userData = await firstValueFrom(
      this.firestoreService.getUserById(this.currentLoginId)
    );
    this.currentUser = this.userService.setUserObject(userData, userData?.id);
    this.userSession.setCurrentUser(this.currentUser);
  }

  subCurrentUser() {
    let currenUserDocRef = this.firestoreService.getUserDocRef(
      this.currentLoginId
    );

    return onSnapshot(currenUserDocRef, (currentUserData) => {
      let userData = currentUserData.data();
      if (userData) {
        let user = this.userService.setUserObject(
          userData,
          this.currentLoginId
        );
        // this.userSession.setCurrentUser(user);
        this.currentUser = user;
        this.getAllUsers();
        this.cdr.detectChanges();
      }
    });
  }

  loadGuestData() {
    let guestData = {
      id: 'Guest',
      userName: 'Frederik Beck',
      profilePic: 3,
      status: true,
      email: 'email@beispiel.com',
    };
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

  get sortedUsers(): appUser[] {
    if (!this.currentUser) return this.users;
    return [
      ...this.users.filter((u) => u.id === this.currentUser?.id),
      ...this.users.filter((u) => u.id !== this.currentUser?.id),
    ];
  }

  filterDirectMessageUsers(): void {
    const otherUserIds = this.directMessages
      .map((conv) =>
        conv.participants.find((id: string) => id !== this.currentLoginId)
      )
      .filter(Boolean);

    this.allDirectMessages = this.users.filter((user) =>
      otherUserIds.includes(user.id)
    );

    if (this.currentUser) {
      const alreadyIncluded = this.allDirectMessages.some(
        (u) => u.id === this.currentUser?.id
      );
      if (!alreadyIncluded) {
        this.allDirectMessages.unshift(this.currentUser);
      }
    }
  }

  closeSearch(): void {
    this.searchTerm = '';
    this.updateFilteredResults();
  }

  addChannel() {
    if (window.innerWidth < 800) {
      this.router.navigate(['/addChannelDialog']);
    } else {
      this.dialog.open(AddChannelDialogComponent, {
        panelClass: 'middle-dialog-panel',
      });
    }
  }

  selectChannel(channel: any): void {
    if (!channel || !channel.channelId) {
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

  selectDirectMessage(user: appUser): void {
    if (!user || !user.id) {
      console.error('User oder user.id ist undefined:', user);
      return;
    }

    const currentUserId = this.currentUser?.id;
    if (!currentUserId) {
      console.error('Current user is not set');
      return;
    }

    const conversation = this.findConversationBetweenUsers(
      user.id,
      currentUserId
    );
    if (!conversation || !conversation.id) {
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

  private findConversationBetweenUsers(
    userId1: string,
    userId2: string
  ): any | null {
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

  selectDirectMessageGast(user: DirectMessage): void {
    if (!user) return;
    this.closeNewMessage.emit();
    this.channelDirectMessageData.setSelectedDirectMessageGast(user);
    if (window.innerWidth < 800) {
      this.closeNewMessage.emit();
      this.router.navigate([
        '/chat-container',
        'conversation',
        'guest',
        user.id,
      ]);
      this.chatTypeSelected.emit('conversation');
    }
  }

  selectGuestChannel(channel: Channel): void {
    this.channelDirectMessageData.setSelectedGuestChannel(channel);
    this.closeNewMessage.emit();
         this.chatTypeSelected.emit('channel');
    if (window.innerWidth < 800 && channel.channelId) {
      this.router.navigate(['/chat-container', 'channel', channel.channelId]);

    }
  }

  openNewMessage(): void {
    if (window.innerWidth < 800) {
      this.router.navigate(['/new-message', this.currentUser?.id]);
    } else {
      this.newMessage.emit();
    }
  }
}
