import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MainMenuComponent } from './main-menu/main-menu.component';
import { ChatTemplateComponent } from './chat-template/chat-template.component';
import { HeaderComponent } from '../shared/header/header.component';
import { ThreadsComponent } from './threads/threads.component';
import { NewMessageComponent } from './new-message/new-message.component';
import { appUser } from '../interfaces/user.interface';
import { SessionService } from '../shared/services/currentUserSession.service';
import { SearchService } from '../shared/services/search.service';
import { FirestoreService } from '../shared/services/firestore.service';
import { UserService } from '../shared/services/user.services';
import { NewMessageSendingService } from '../shared/services/new-message-sending.service';

@Component({
  selector: 'app-main-content',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MainMenuComponent,
    ChatTemplateComponent,
    HeaderComponent,
    ThreadsComponent,
    NewMessageComponent,
  ],
  templateUrl: './main-content.component.html',
  styleUrls: ['./main-content.component.scss'],
})
export class MainContentComponent {
  readonly searchService = inject(SearchService);

  // Holds the current logged-in user
  currentUser = signal<appUser | null>(null);
  channels: any[] = [];
  userChannels: any[] = [];
  currentChatId: string | null = null;
  currentThreadId: string | null = null;
  showNewMessage = false;
  currentLoginId = '';
  currentLoginEmail = '';
  gastLogin = false;
  showMainMenu = true;
  showThread = false;
  currentUser$ = this.userSession.currentLogingUser$;
  currentChatType: 'channel' | 'conversation' | null = null;
  isSmallScreen = window.innerWidth < 1300;
  private firstLoad = true;

  constructor(
    private userSession: SessionService,
    private router: Router,
    private userService: UserService,
    private firestoreService: FirestoreService,
    private newMessageService: NewMessageSendingService
  ) {
    // Initializes login data from router state
    this.initializeLogin();
    this.handleResize();

  this.newMessageService.chatSelected.subscribe((chatId) => {
    this.onChatSelected(chatId);
  });

  this.newMessageService.chatTypeSelected.subscribe((type) => {
    this.onChatTypeSelected(type);
  });

  this.newMessageService.closeNewMessage.subscribe(() => {
    this.closeNewMessage();
  });
  }

  // Sets up current user login info from router navigation state
  initializeLogin(): void {
    const state = this.router.getCurrentNavigation()?.extras.state as {
      loginEmail: string;
      loginId: string;
    };

    if (!state) return;

    if (state.loginId === 'Guest') {
      this.gastLogin = true;
      this.loadGuestData();
      const user = this.currentUser();
      if (user) this.userSession.setCurrentUser(user);
    } else {
      this.loadUserData(state);
    }
  }

  // Angular OnInit lifecycle: cleans up guest data, loads current user, and fetches channels
  async ngOnInit(): Promise<void> {
    await this.cleanupGuestData();
    await this.loadCurrentUser();
    this.loadAllChannels();
    this.handleResize();
      if (!this.currentChatId && this.firstLoad) {
    this.showNewMessage = true;
    this.firstLoad = false;
  }
  }

  // Listen for window resize events
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.handleResize();
  }

  // Switch route based on screen size
private handleResize(): void {
  const wasSmallScreen = this.isSmallScreen;
  this.isSmallScreen = window.innerWidth < 1300;

  // Only navigate for small screen entry/exit if needed
  if (this.isSmallScreen && !wasSmallScreen) {
    this.router.navigate(['/main-menu']);
  } else if (!this.isSmallScreen && wasSmallScreen) {
    this.router.navigate(['/main']);
  }

  // On large screens, always show the thread if a thread is selected
  if (!this.isSmallScreen && this.currentThreadId) {
    this.showThread = true;
  }
}


  // Removes all guest channels, conversations, and messages from Firestore
  async cleanupGuestData(): Promise<void> {
    await this.firestoreService.deleteGuestChannels();
    await this.firestoreService.deleteGuestConversations();
    await this.firestoreService.deleteGuestMessages();
  }

  // Loads the current user's data from Firestore
  async loadCurrentUser(): Promise<void> {
    if (!this.currentLoginId) return;
    const userData = await firstValueFrom(
      this.firestoreService.getUserById(this.currentLoginId)
    );
    const user = this.userService.setUserObject(userData, userData?.id);
    this.currentUser.set(user);
    this.userSession.setCurrentUser(user);
  }

  // Sets the currently selected chat type (channel or conversation)
  onChatTypeSelected(type: 'channel' | 'conversation'): void {
    this.currentChatType = type;
  }

  // Loads all channels from Firestore and handles subscription
  loadAllChannels(): void {
    this.firestoreService.getChannels().subscribe({
      next: (channels) => this.handleLoadedChannels(channels),
      error: (err) => console.error('Fehler beim Laden der Channels:', err),
    });
  }

  // Processes loaded channels and filters user-specific channels
  handleLoadedChannels(channels: any[]): void {
    this.channels = channels;
    this.userChannels = this.currentLoginId
      ? channels.filter((c) => c.members?.includes(this.currentLoginId))
      : [...channels];

    this.searchService.setFirestoreChannels(channels);
  }

  // Automatically shows New Message on load
  showNewMessageOnLoad(): void {
    this.showNewMessage = true;
    return;
  }

  // Sets up guest user object
  loadGuestData(): void {
    const guestUser: appUser = {
      id: 'Guest',
      userName: 'Frederik Beck',
      profilePic: 3,
      status: true,
      email: 'email@beispiel.com',
    };
    this.currentUser.set(guestUser);
  }

  // Loads user data from router state
  loadUserData(state: { loginEmail: string; loginId: string }): void {
    this.currentLoginEmail = state.loginEmail ?? '';
    this.currentLoginId = state.loginId ?? '';
  }

  // Sets the currently selected chat and resets thread view
onChatSelected(chatId: string): void {
  this.currentChatId = chatId;
  this.showNewMessage = false;
  this.showThread = false;
  this.currentThreadId = null;
}

  // Opens a thread for the given thread ID
  openThread(threadId: string): void {
    this.currentThreadId = threadId;
    this.showThread = true;
  }

  // Closes the currently open thread
  closeThread(): void {
    this.showThread = false;
    this.currentThreadId = null;
  }

  // Opens the "new message" UI, navigates for mobile
  openNewMessage(): void {
    if (window.innerWidth < 1300) {
      this.router.navigate(['/new-message', this.currentUser()?.id]);
      return;
    }
    this.showNewMessage = true;
  }

  // Closes the "new message" UI
  closeNewMessage(): void {
    this.showNewMessage = false;
  }

  handleChannelLeft(): void {
  if (!this.isSmallScreen) {
    this.showNewMessage = true; // trigger New Message view
    this.currentChatId = null;   // optional: clear selected chat
  }
}
}
