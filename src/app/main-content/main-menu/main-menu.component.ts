import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
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
    MatDividerModule
  ],
  templateUrl: './main-menu.component.html',
  styleUrl: './main-menu.component.scss'
})
export class MainMenuComponent implements OnInit {
  readonly dialog = inject(MatDialog);
  readonly searchService = inject(SearchService);
  readonly channelDirectMessageData = inject(ChannelsDirectMessageService);
  readonly firestoreService = inject(FirestoreService);

  gastLogin = false;

  showChannels = true;
  showDirectMessages = true;

  searchTerm = '';
  filteredChannels: any[] = [];
  filteredDirectMessages: any[] = [];

  channels: any[] = [];
  users: any[] = [];
  directMessages: any[] = [];

  constructor(private router: Router) { }

  ngOnInit(): void {
    if (!this.gastLogin) {
      this.firestoreService.getChannels().subscribe(c => {
        this.channels = c;
        this.searchService.setFirestoreChannels(c);
        console.log('Channels', this.channels);

      });

      this.firestoreService.getUsers().subscribe(u => {
        this.users = u;
        this.searchService.setFirestoreUsers(u);
        console.log('Users', this.users);

      });

      this.firestoreService.getConversations().subscribe(conv => {
        this.directMessages = conv;
        console.log('Direktnachrichten', this.directMessages);

      });
    }
    this.updateFilteredResults();
  }

  get isSearchActive(): boolean {
    return this.searchTerm.trim().length > 0;
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

  private filterAsGuest(query: string, isChannel: boolean, isDirect: boolean): void {
    if (isChannel) {
      this.filteredChannels = this.channelDirectMessageData
        .getChannels()
        .filter(c => c.toLowerCase().startsWith(query));
      this.filteredDirectMessages = [];
    } else if (isDirect) {
      this.filteredDirectMessages = this.channelDirectMessageData
        .getDirectMessages()
        .filter(dm => dm.name.toLowerCase().startsWith(query));
      this.filteredChannels = [];
    } else {
      this.filteredChannels = this.channelDirectMessageData
        .getChannels()
        .filter(c => c.toLowerCase().startsWith(query));

      this.filteredDirectMessages = this.channelDirectMessageData
        .getDirectMessages()
        .filter(dm => dm.name.toLowerCase().startsWith(query));
    }
  }

  private filterAsUser(query: string, isChannel: boolean, isDirect: boolean): void {
    if (isChannel) {
      this.filteredChannels = this.searchService
        .filterFirestoreChannels(query)
        .map(c => c.name)
        .filter(c => c.toLowerCase().startsWith(query));
      this.filteredDirectMessages = [];
    } else if (isDirect) {
      this.filteredDirectMessages = this.searchService
        .filterFirestoreDirectMessages(query)
        .filter(u => u.userName.toLowerCase().startsWith(query));
      this.filteredChannels = [];
    } else {
      this.filteredChannels = this.searchService
        .filterFirestoreChannels(query)
        .map(c => c.name)
        .filter(c => c.toLowerCase().startsWith(query));

      this.filteredDirectMessages = this.searchService
        .filterFirestoreDirectMessages(query)
        .filter(u => u.userName.toLowerCase().startsWith(query));
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
      data: { source: 'main-menu' }
    });
  }

  addChannel() {
    this.router.navigate(['/addChannelDialog']);
  }
}