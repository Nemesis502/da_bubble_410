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
    ThreadsComponent
  ],
  templateUrl: './main-content.component.html',
  styleUrls: ['./main-content.component.scss']
})
export class MainContentComponent {
  readonly searchService = inject(SearchService);
  readonly firestoreService = inject(FirestoreService);

  currentUser: appUser | null = null;
  channels: any[] = [];
  userChannels: any[] = [];
  currentChatId: string | null = null;
  currentThreadId: string | null = null;

  currentLoginId = '';

  showMainMenu = true;
  showThread = false;

  constructor(
    private userSession: SessionService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.currentUser = this.userSession.getCurrentUser();
    this.currentLoginId = this.currentUser?.id ?? '';
    this.loadAllChannels();
  }

  loadAllChannels(): void {
    this.firestoreService.getChannels().subscribe((channels) => {
      console.log('Firestore channels:', channels);
      this.channels = channels;

      if (!this.currentLoginId) {
        console.warn('currentLoginId ist leer — Channel-Filter nach Mitgliedern wird übersprungen.');
      }

      this.userChannels = this.currentLoginId
        ? channels.filter((channel) => channel.members?.includes(this.currentLoginId))
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
      }
      else {
        console.warn('Keine userChannels gefunden.');
      }
    }, (err) => {
      console.error('Fehler beim Laden der Channels:', err);
    });
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

}