import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MainMenuComponent } from './main-menu/main-menu.component';
import { ChatTemplateComponent } from './chat-template/chat-template.component';
import { HeaderComponent } from '../shared/header/header.component';
import { appUser } from '../interfaces/user.interface';
import { SessionService } from '../shared/services/currentUserSession.service';
import { SearchService } from '../shared/services/search.service';
import { FirestoreService } from '../shared/services/firestore.service';
import { Router } from '@angular/router';
import { ThreadsComponent } from './threads/threads.component';
import { NewMessageComponent } from './new-message/new-message.component';
import { UserService } from '../shared/services/user.services';
import { firstValueFrom } from 'rxjs';

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

  currentUser: appUser | null = null;
  channels: any[] = [];
  userChannels: any[] = [];
  currentChatId: string | null = null;
  currentThreadId: string | null = null;
  showNewMessage: boolean = false;
  currentLoginId = '';
  currentLoginEmail = '';
  gastLogin = false;
  showMainMenu = true;
  showThread = false;
  currentUser$ = this.userSession.currentLogingUser$;
  currentChatType: 'channel' | 'conversation' | null = null;
  constructor(
    private userSession: SessionService,
    private router: Router,
    private userService: UserService,
    private firestoreService: FirestoreService
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
      }
    }
  }

  async ngOnInit(): Promise<void> {
    await this.firestoreService.deleteGuestChannels();
    await this.firestoreService.deleteGuestConversations();
    await this.firestoreService.deleteGuestMessages();
    await this.getCurrentUserLogIn();
    this.currentUser = this.userSession.getCurrentUser();
    this.currentLoginId = this.currentUser?.id ?? '';
    this.loadAllChannels();
  }

  async getCurrentUserLogIn() {
    let userData = await firstValueFrom(
      this.firestoreService.getUserById(this.currentLoginId)
    );
    this.currentUser = this.userService.setUserObject(userData, userData?.id);
    this.userSession.setCurrentUser(this.currentUser);
  }

  onChatTypeSelected(type: 'channel' | 'conversation'): void {
    this.currentChatType = type;
  }

  loadAllChannels(): void {
    this.firestoreService.getChannels().subscribe(
      (channels) => {
        this.channels = channels;
        if (!this.currentLoginId) {
        }
        this.userChannels = this.currentLoginId
          ? channels.filter((channel) =>
              channel.members?.includes(this.currentLoginId)
            )
          : channels.slice();

        this.searchService.setFirestoreChannels(channels);

        if (this.userChannels.length > 0) {
          const first = this.userChannels[0];
          const firstId = first.channelId ?? first.id ?? null;

          if (window.innerWidth >= 800) {
            this.currentChatId = firstId;
            this.showThread = false;
            this.currentThreadId = null;
          } else {
            if (firstId) {
              this.router.navigate(['/chat-container', firstId]);
            }
          }
        } else {
          console.warn('Keine userChannels gefunden.');
        }
      },
      (err) => {
        console.error('Fehler beim Laden der Channels:', err);
      }
    );
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

  loadUserData(state: { loginEmail: string; loginId: string }) {
    this.currentLoginEmail = state.loginEmail ?? '';
    this.currentLoginId = state.loginId ?? '';
  }

  onChatSelected(chatId: string): void {
    this.currentChatId = chatId;
    this.showThread = false;
    this.currentThreadId = null;
  }

  openThread(threadId: string): void {
    this.currentThreadId = threadId;
    this.showThread = true;
  }

  closeThread(): void {
    this.showThread = false;
    this.currentThreadId = null;
  }

  openNewMessage(): void {
    if (window.innerWidth < 800) {
      this.router.navigate(['/new-message', this.currentUser?.id]);
    } else {
      this.showNewMessage = true;
    }
  }

  closeNewMessage(): void {
    this.showNewMessage = false;
  }
}
