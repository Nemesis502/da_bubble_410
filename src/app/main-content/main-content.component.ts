import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MainMenuComponent } from './main-menu/main-menu.component';
import { ChatTemplateContainerComponent } from './chat-template-container/chat-template-container.component';
import { ChatTemplateComponent } from './chat-template/chat-template.component';
import { HeaderComponent } from '../shared/header/header.component';
import { appUser } from '../interfaces/user.interface';
import { SessionService } from '../shared/services/currentUserSession.service';
import { SearchService } from '../shared/services/search.service';
import { FirestoreService } from '../shared/services/firestore.service';

@Component({
  selector: 'app-main-content',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MainMenuComponent,
    ChatTemplateComponent,
    HeaderComponent
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

  currentLoginId = '';

  showMainMenu = true;
  showThread = false

  constructor(
    private userSession: SessionService,
  ) { }

  ngOnInit(): void {
    // hole aktuellen User
    this.currentUser = this.userSession.getCurrentUser();
    this.currentLoginId = this.currentUser?.id ?? '';

    console.log('ngOnInit — currentUser:', this.currentUser);
    console.log('ngOnInit — currentLoginId:', this.currentLoginId);

    this.loadAllChannels();
  }

  loadAllChannels(): void {
    this.firestoreService.getChannels().subscribe((channels) => {
      console.log('Firestore channels:', channels);
      this.channels = channels;

      // fallback: falls currentLoginId leer ist, nimm alle Channels (oder warne)
      if (!this.currentLoginId) {
        console.warn('currentLoginId ist leer — Channel-Filter nach Mitgliedern wird übersprungen.');
      }

      // benutze members-Filter nur wenn aktuelle ID vorhanden
      this.userChannels = this.currentLoginId
        ? channels.filter((channel) => channel.members?.includes(this.currentLoginId))
        : channels.slice(); // kopiere alle Channels

      this.searchService.setFirestoreChannels(channels);

      if (this.userChannels.length > 0) {
        const first = this.userChannels[0];
        // prüfe welches Feld die ID enthält: channelId oder id
        this.currentChatId = first.channelId ?? first.id ?? null;
        console.log('Erster Channel (userChannels[0]):', first);
        console.log('Setze currentChatId auf:', this.currentChatId);
      } else {
        console.warn('Keine userChannels gefunden.');
      }
    }, (err) => {
      console.error('Fehler beim Laden der Channels:', err);
    });
  }
}