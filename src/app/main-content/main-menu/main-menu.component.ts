import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
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
import { ChannelsDirectMessageService, DirectMessage } from '../../shared/services/channels-direct-message.service';
import { FirestoreService } from '../../shared/services/firestore.service';

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
export class MainMenuComponent {
  readonly dialog = inject(MatDialog);
  readonly searchService = inject(SearchService);
  readonly channelDirectMessageData = inject(ChannelsDirectMessageService);

  gastLogin = false;
  showChannels = true;
  showDirectMessages = true;

  searchTerm: string = '';
  channels: any[] = [];
  directMessages: any[] = [];
  conversations: any[] = [];
  filteredChannels: string[] = [];
  filteredDirectMessages: DirectMessage[] = [];

  constructor(private firestoreService: FirestoreService) {
    this.updateFilteredResults();
  }

  ngOnInit(): void {
    this.firestoreService.getChannels().subscribe(c => this.channels = c);
    this.firestoreService.getUsers().subscribe(u => this.directMessages = u); // oder filtern
    this.firestoreService.getConversations().subscribe(conv => this.conversations = conv);
  }

  openMenuDialog(): void {
    this.dialog.open(MenuDialogComponent, {
      position: { bottom: '0' },
      maxWidth: '100vw',
      width: '100vw',
      height: '210px',
      panelClass: 'bottom-dialog-panel'
    });
  }

  updateFilteredResults(): void {
    const term = this.searchTerm.trim().toLowerCase();

    if (term.startsWith('#')) {
      const query = term.slice(1);
      this.filteredChannels = this.searchService
        .filterChannels(query)
        .filter(c => c.toLowerCase().startsWith(query));
      this.filteredDirectMessages = [];
    } else if (term.startsWith('@')) {
      const query = term.slice(1);
      this.filteredDirectMessages = this.searchService
        .filterDirectMessages(query)
        .filter(dm => dm.name.toLowerCase().startsWith(query));
      this.filteredChannels = [];
    } else {
      this.filteredChannels = this.searchService
        .filterChannels(term)
        .filter(c => c.toLowerCase().startsWith(term));

      this.filteredDirectMessages = this.searchService
        .filterDirectMessages(term)
        .filter(dm => dm.name.toLowerCase().startsWith(term));
    }
  }

  get isSearchActive(): boolean {
    return this.searchTerm.trim().length > 0;
  }

  closeSearch(): void {
    this.searchTerm = '';
    this.updateFilteredResults();
  }
}