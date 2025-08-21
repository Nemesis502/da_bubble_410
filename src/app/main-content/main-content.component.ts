import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MainMenuComponent } from './main-menu/main-menu.component';
// import { ChatTemplateContainerComponent } from './chat-template-container/threads.component';
import { ChatTemplateComponent } from './chat-template/chat-template.component';
import { HeaderComponent } from '../shared/header/header.component';
import { appUser } from '../interfaces/user.interface';
import { SessionService } from '../shared/services/currentUserSession.service';
import { SearchService } from '../shared/services/search.service';
import { FirestoreService } from '../shared/services/firestore.service';
import { Router } from '@angular/router';
import { ThreadsComponent } from './threads/threads.component';
import { NewMessageComponent } from "./new-message/new-message.component";
import { ChannelsDirectMessageService } from '../shared/services/channels-direct-message.service';

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
    NewMessageComponent
  ],
  templateUrl: './main-content.component.html',
  styleUrls: ['./main-content.component.scss'],
})
export class MainContentComponent {
  readonly searchService = inject(SearchService);
  readonly firestoreService = inject(FirestoreService);

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

  constructor(private userSession: SessionService, private router: Router, private channelService: ChannelsDirectMessageService) {
    // const navigation = this.router.getCurrentNavigation();
    // const state = navigation?.extras.state as {
    //   loginEmail: string;
    //   loginId: string;
    // };
    // if (state) {
    //   if (state.loginId == 'Guest') {
    //     this.gastLogin = true;
    //     this.loadGuestData();
    //     this.userSession.setCurrentUser(this.currentUser!);
    //   } else {
    //     this.loadUserData(state);
    //     // this.unsubCurrentUser = this.subCurrentUser();
    //   }
    // }
  }

  ngOnInit(): void {
    this.currentUser = this.userSession.getCurrentUser();
    // console.log(this.currentUser);
    this.currentLoginId = this.currentUser?.id ?? '';
    if (this.currentLoginId == "Guest") {
      // this.userChannels = this.channelService.channels
      // console.log(this.userChannels);

    } else {
      this.loadAllChannels();
    }
  }

  loadAllChannels(): void {
    this.firestoreService.getChannels().subscribe(

      (channels) => {

        console.log('Firestore channels:', channels);
        this.channels = channels;

        if (!this.currentLoginId) {
          console.warn(
            'currentLoginId ist leer — Channel-Filter nach Mitgliedern wird übersprungen.'
          );
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
            console.log('Desktop: Hauptchat geladen →', this.currentChatId);
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
    console.log('Chat-ID gesetzt:', this.currentChatId);
  }

  openThread(threadId: string): void {
    this.currentThreadId = threadId;
    this.showThread = true;
    console.log('Thread geöffnet in Right →', this.currentThreadId);
  }

  closeThread(): void {
    this.showThread = false;
    this.currentThreadId = null;
    console.log('Thread geschlossen → Right leer');
  }

  openNewMessage(): void {
    if (window.innerWidth < 800) {
      this.router.navigate(['/new-message', this.currentUser?.id]);
    } else {
      this.showNewMessage = true;
      console.log('triggered', this.showNewMessage)
    }
  }

  closeNewMessage(): void {
    this.showNewMessage = false;
  }
}
