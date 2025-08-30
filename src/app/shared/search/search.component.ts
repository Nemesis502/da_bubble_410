// import { CommonModule } from '@angular/common';
// import { ChangeDetectorRef, Component, EventEmitter, inject, Output } from '@angular/core';
// import { MatDialog } from '@angular/material/dialog';
// import { MatFormFieldModule } from '@angular/material/form-field';
// import { SearchService } from '../services/search.service';
// import { ChannelsDirectMessageService, DirectMessage } from '../services/channels-direct-message.service';
// import { FirestoreService } from '../services/firestore.service';
// import { appUser } from '../../interfaces/user.interface';
// import { FormsModule } from '@angular/forms';
// import { UserService } from '../services/user.services';
// import { SessionService } from '../services/currentUserSession.service';
// import { DirectMessageService } from '../services/direct-message.service';
// import { Router } from '@angular/router';
// import { onSnapshot, Timestamp } from 'firebase/firestore';
// import { MatIconModule } from '@angular/material/icon';
// import { MatInputModule } from '@angular/material/input';
// import { firstValueFrom } from 'rxjs';
// import { Channel } from '../../interfaces/channel.interface';

// @Component({
//   selector: 'app-search',
//   standalone: true,
//   imports: [
//     CommonModule,
//     FormsModule,
//     MatFormFieldModule,
//     MatInputModule,
//     MatIconModule
//   ],
//   templateUrl: './search.component.html',
//   styleUrl: './search.component.scss'
// })
// export class SearchComponent {
//   @Output() closeNewMessage = new EventEmitter<void>();
//   @Output() chatSelected = new EventEmitter<string>();
//   @Output() chatTypeSelected = new EventEmitter<'channel' | 'conversation'>();

//   readonly dialog = inject(MatDialog);
//   readonly searchService = inject(SearchService);
//   readonly channelDirectMessageData = inject(ChannelsDirectMessageService);
//   readonly firestoreService = inject(FirestoreService);

//   gastLogin = false;
//   showChannels = true;
//   showDirectMessages = true;

//   currentLoginId = '';
//   currentLoginEmail = '';
//   searchTerm = '';

//   filteredChannels: any[] = [];
//   filteredDirectMessages: any[] = [];
//   filteredMessagesFromChannels: Array<{ channel: Channel; hits: Array<{ id: string; text: string; timestamp: Timestamp }> }> = [];
//   filteredMessagesFromDirectMessages: Array<{ conversationId: string; user: appUser; hits: Array<{ id: string; text: string; timestamp: any }>; }> = [];
//   channels: any[] = [];
//   userChannels: any[] = [];
//   users: any[] = [];
//   currentUser: appUser | null = null;
//   allDirectMessages: appUser[] = [];
//   directMessages: any[] = [];
//   unsubCurrentUser;

//   constructor(
//     private router: Router,
//     private userService: UserService,
//     private userSession: SessionService,
//     private cdr: ChangeDetectorRef,
//     private directMessageService: DirectMessageService
//   ) {
//     const navigation = this.router.getCurrentNavigation();
//     const state = navigation?.extras.state as {
//       loginEmail: string;
//       loginId: string;
//     };
//     if (state) {
//       if (state.loginId == 'Guest') {
//         this.gastLogin = true;
//         this.loadGuestData();
//       } else {
//         this.loadUserData(state);
//         this.unsubCurrentUser = this.subCurrentUser();
//       }
//     }
//   }

//   async ngOnInit(): Promise<void> {
//     const sessionUser = this.userSession.getCurrentUser();
//     if (sessionUser?.id == "Guest") {
//       this.gastLogin = true;
//     } else {
//       if (!this.gastLogin && sessionUser && !this.currentLoginId) {
//         this.currentUser = sessionUser;
//         this.currentLoginId = sessionUser.id!;
//         this.currentLoginEmail = sessionUser.email!;
//         this.subCurrentUser();
//         this.directMessageService.setCurrentUser(this.currentUser);

//         await this.directMessageService.ensureSelfConversationExists();
//       }

//       if (!this.gastLogin && this.currentLoginId) {
//         await this.getCurrentUserLogIn();
//         this.searchService.setCurrentUserId(this.currentLoginId);
//       }

//       if (!this.gastLogin) {
//         this.firestoreService.getChannels().subscribe((c) => {
//           this.channels = c;
//           this.userChannels = c.filter((channel) =>
//             channel.members.includes(this.currentLoginId)
//           );
//           this.searchService.setFirestoreChannels(c);
//         });

//         this.getAllUsers();

//         this.firestoreService
//           .getConversationsByUserId(this.currentLoginId)
//           .subscribe(async (conv) => {
//             this.directMessages = conv;
//             this.filterDirectMessageUsers();
//             this.searchService.setDirectMessagePartnerIds(
//               this.directMessages,
//               this.currentLoginId
//             );

//             await this.updateFilteredResults();
//           });
//       }
//     }
//   }

//   async getCurrentUserLogIn() {
//     this.userService.updateUserStatusTrue(this.currentLoginId);
//     let userData = await firstValueFrom(
//       this.firestoreService.getUserById(this.currentLoginId)
//     );
//     this.currentUser = this.userService.setUserObject(userData, userData?.id);
//   }

//   loadGuestData() {
//     let guestData = {
//       id: 'Guest',
//       userName: 'Frederik Beck',
//       profilePic: 3,
//       status: true,
//       email: 'email@beispiel.com',
//     };
//     this.currentUser = guestData;
//   }

//   loadUserData(state: { loginEmail: string; loginId: string }) {
//     this.currentLoginEmail = state.loginEmail ?? '';
//     this.currentLoginId = state.loginId ?? '';
//   }

//   subCurrentUser() {
//     let currenUserDocRef = this.firestoreService.getUserDocRef(
//       this.currentLoginId
//     );

//     return onSnapshot(currenUserDocRef, (currentUserData) => {
//       let userData = currentUserData.data();
//       if (userData) {
//         let user = this.userService.setUserObject(
//           userData,
//           this.currentLoginId
//         );
//         this.currentUser = user;
//         this.getAllUsers();
//         this.cdr.detectChanges();
//       }
//     });
//   }

//   getAllUsers() {
//     this.firestoreService.getUsers().subscribe((u) => {
//       this.users = u;
//       this.searchService.setFirestoreUsers(u);

//       if (!this.gastLogin) {
//         this.filterDirectMessageUsers();
//         this.searchService.setCurrentUserId(this.currentLoginId);
//         this.searchService.setDirectMessagePartnerIds(
//           this.directMessages,
//           this.currentLoginId
//         );
//       }
//     });
//   }

//   filterDirectMessageUsers(): void {
//     const otherUserIds = this.directMessages
//       .map((conv) =>
//         conv.participants.find((id: string) => id !== this.currentLoginId)
//       )
//       .filter(Boolean);

//     this.allDirectMessages = this.users.filter((user) =>
//       otherUserIds.includes(user.id)
//     );

//     if (this.currentUser) {
//       const alreadyIncluded = this.allDirectMessages.some(
//         (u) => u.id === this.currentUser?.id
//       );
//       if (!alreadyIncluded) {
//         this.allDirectMessages.unshift(this.currentUser);
//       }
//     }
//   }

//   selectChannel(channel: any): void {
//     if (!channel?.channelId) {
//       console.error('Channel oder channelId ist undefined:', channel);
//       return;
//     }

//     this.channelDirectMessageData.setSelectedChannel(channel);
//     this.closeNewMessage.emit();

//     const parentListens =
//       this.chatSelected.observers.length > 0 ||
//       this.chatTypeSelected.observers.length > 0;

//     // Einheitlicher Pfad wie bei DMs: /chat-container/:id
//     if (window.innerWidth < 800 || !parentListens) {
//       this.router.navigate(['/chat-container', 'channel', channel.channelId]); // Channel
//       return;
//     }

//     // Desktop + Parent hört zu
//     this.chatSelected.emit(channel.channelId);
//     this.chatTypeSelected.emit('channel');

//     this.searchTerm = '';
//   }


//   async updateFilteredResults(): Promise<void> {
//     const { channels, directMessages, contentResults, directMessageResults } =
//       await this.searchService.updateFilteredResults(
//         this.searchTerm,
//         this.gastLogin,
//         this.directMessages,
//         this.currentLoginId
//       );


//     this.filteredChannels = channels;
//     this.filteredDirectMessages = directMessages;
//     this.filteredMessagesFromChannels = contentResults;
//     this.filteredMessagesFromDirectMessages = directMessageResults;
//   }

//   loadGuestChannel(query: string) {
//     this.filteredChannels = this.channelDirectMessageData
//       .getChannels()
//       .filter((c) => c.name.toLowerCase().startsWith(query));
//   }

//   loadGuestDM(query: string) {
//     this.filteredDirectMessages = this.channelDirectMessageData
//       .getDirectMessagesForGast()
//       .filter((dm) => dm.name.toLowerCase().startsWith(query));
//   }

//   loadGuestDMAndChannel(query: string) {
//     this.filteredChannels = this.channelDirectMessageData
//       .getChannels()
//       .filter((c) => c.name.toLowerCase().startsWith(query));
//     this.filteredDirectMessages = this.channelDirectMessageData
//       .getDirectMessagesForGast()
//       .filter((dm) => dm.name.toLowerCase().startsWith(query));
//   }

//   ngOnDestroy() {
//     if (this.unsubCurrentUser) {
//       this.unsubCurrentUser();
//     }
//   }

//   get isSearchActive(): boolean {
//     return this.searchTerm.trim().length > 0;
//   }

//   selectDirectMessage(user: appUser): void {
//     if (!user || !user.id) {
//       console.error('User oder user.id ist undefined:', user);
//       return;
//     }

//     const currentUserId = this.currentUser?.id;
//     if (!currentUserId) {
//       console.error('Current user is not set');
//       return;
//     }

//     const conversation = this.findConversationBetweenUsers(
//       user.id,
//       currentUserId
//     );
//     if (!conversation || !conversation.id) {
//       console.error('Keine passende Konversation gefunden für:', user);
//       return;
//     }

//     this.channelDirectMessageData.setSelectedDirectMessage(user);
//     this.closeNewMessage.emit();
//     if (window.innerWidth < 800) {
//       this.router.navigate([
//         '/chat-container', 'conversation', conversation.id,
//       ]);
//     } else {
//       this.chatTypeSelected.emit('conversation');
//       this.chatSelected.emit(conversation.id);
//     }

//     this.searchTerm = '';
//   }

//   private findConversationBetweenUsers(userId1: string, userId2: string): any | null {
//     return this.directMessages.find((conv) => {
//       const participants: string[] = conv.members || conv.participants;
//       const sortedParticipants = [...participants].sort();
//       const sortedIds = [userId1, userId2].sort();

//       return sortedParticipants[0] === sortedIds[0] && sortedParticipants[1] === sortedIds[1];
//     }) || null;
//   }

//   selectDirectMessageGast(user: DirectMessage): void {
//     this.router.navigate(['/chat', user.name]);
//   }

//   private norm(v: any) { return (v ?? '').toString().toLowerCase(); }

//   async searchMessagesInMemberChannels(query: string, perChannelLimit = 200, maxHitsPerChannel = 1) {
//     const q = this.norm(query);
//     if (!q || !this.currentUser?.id) return [];

//     const memberChannels = await firstValueFrom(this.firestoreService.getMemberChannels(this.currentUser.id));

//     const results: Array<{ channel: Channel; hits: Array<{ id: string; text: string; timestamp: any }> }> = [];

//     for (const ch of memberChannels) {
//       if (!ch.channelId) continue;

//       const msgs = await firstValueFrom(
//         this.firestoreService.getRecentMessagesForChannel(ch.channelId, perChannelLimit)
//       );

//       const hits = (msgs ?? [])
//         .filter(m => this.norm(m.text ?? '').includes(q))
//         .slice(0, maxHitsPerChannel)
//         .map(m => ({
//           id: m.id,
//           text: m.text ?? '',
//           timestamp: m.timestamp
//         }));

//       if (hits.length) results.push({ channel: ch, hits });
//     }

//     return results;
//   }
// }

import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { DocumentData, DocumentReference, onSnapshot, Timestamp } from 'firebase/firestore';

import { SearchService } from '../services/search.service';
import { ChannelsDirectMessageService, DirectMessage } from '../services/channels-direct-message.service';
import { FirestoreService } from '../services/firestore.service';
import { UserService } from '../services/user.services';
import { SessionService } from '../services/currentUserSession.service';
import { DirectMessageService } from '../services/direct-message.service';

import { appUser } from '../../interfaces/user.interface';
import { Channel } from '../../interfaces/channel.interface';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent {
  @Output() closeNewMessage = new EventEmitter<void>();
  @Output() chatSelected = new EventEmitter<string>();
  @Output() chatTypeSelected = new EventEmitter<'channel' | 'conversation'>();

  readonly searchService = inject(SearchService);
  readonly channelDirectMessageData = inject(ChannelsDirectMessageService);
  readonly firestoreService = inject(FirestoreService);
  readonly dialog = inject(MatDialog);

  searchTerm = '';
  gastLogin = false;
  currentUser: appUser | null = null;
  currentLoginId = '';
  currentLoginEmail = '';

  filteredChannels: Channel[] = [];
  filteredDirectMessagesUsers: appUser[] = [];
  filteredDirectMessagesGuests: DirectMessage[] = [];
  filteredMessagesFromChannels: Array<{ channel: Channel; hits: Array<{ id: string; text: string; timestamp: Timestamp }> }> = [];
  filteredMessagesFromDirectMessages: Array<{ conversationId: string; user: appUser; hits: Array<{ id: string; text: string; timestamp: any }> }> = [];

  users: appUser[] = [];
  directMessages: any[] = [];
  unsubCurrentUser: any;

  constructor(
    private router: Router,
    private userService: UserService,
    private userSession: SessionService,
    private cdr: ChangeDetectorRef,
    private directMessageService: DirectMessageService
  ) {
    this.initLoginState();
  }

  initLoginState(): void {
    const navState = this.router.getCurrentNavigation()?.extras.state as { loginEmail: string; loginId: string };
    if (!navState) return;

    if (navState.loginId === 'Guest') this.gastLogin = true;
    else this.loadUserLogin(navState);

    if (!this.gastLogin) this.subCurrentUser();
  }

  loadUserLogin(state: { loginEmail: string; loginId: string }): void {
    this.currentLoginId = state.loginId ?? '';
    this.currentLoginEmail = state.loginEmail as string;
  }

  async ngOnInit(): Promise<void> {
    const sessionUser = this.userSession.getCurrentUser();
    if (sessionUser?.id === 'Guest') {
      this.gastLogin = true;
      this.loadGuestData();
    } else if (sessionUser) {
      await this.initializeLoggedInUser(sessionUser);
    }
  }

  loadGuestData(): void {
    this.currentUser = { id: 'Guest', userName: 'Frederik Beck', profilePic: 3, status: true, email: 'email@beispiel.com' };
  }

  async initializeLoggedInUser(user: appUser) {
    this.currentUser = user;
    this.currentLoginId = user.id!;
    this.currentLoginEmail = user.email!;
    this.directMessageService.setCurrentUser(this.currentUser);
    await this.directMessageService.ensureSelfConversationExists();
    this.searchService.setCurrentUserId(this.currentLoginId);

    this.firestoreService.getChannels().subscribe(channels => this.setChannels(channels));
    this.getAllUsers();
    this.firestoreService.getConversationsByUserId(this.currentLoginId)
      .subscribe(conv => this.setDirectMessages(conv));
  }

  setChannels(channels: Channel[]): void {
    this.filteredChannels = channels.filter(ch => ch.members.includes(this.currentLoginId));
    this.searchService.setFirestoreChannels(channels);
  }

  setDirectMessages(conv: any[]): void {
    this.directMessages = conv;
    this.filterDirectMessageUsers();
    this.searchService.setDirectMessagePartnerIds(conv, this.currentLoginId);
    this.updateFilteredResults();
  }

  private subCurrentUser() {
    const ref: DocumentReference<DocumentData> = this.firestoreService.getUserDocRef(this.currentLoginId);

    if (!ref) return;

    this.unsubCurrentUser = onSnapshot(ref, (userDoc) => {
      const userData = userDoc.data();
      if (!userData) return;

      this.currentUser = this.userService.setUserObject(userData, this.currentLoginId);
      this.getAllUsers();
      this.cdr.detectChanges();
    });
  }

  getAllUsers(): void {
    this.firestoreService.getUsers().subscribe(u => {
      this.users = u;
      this.searchService.setFirestoreUsers(u);
      if (!this.gastLogin) this.filterDirectMessageUsers();
    });
  }

  filterDirectMessageUsers(): void {
    const otherIds = this.directMessages
      .map(c => c.participants.find((id: string) => id !== this.currentLoginId))
      .filter(Boolean) as string[];

    this.filteredDirectMessagesUsers = this.users.filter(u => u.id && otherIds.includes(u.id));

    if (this.currentUser && !this.filteredDirectMessagesUsers.some(u => u.id === this.currentUser?.id)) {
      this.filteredDirectMessagesUsers.unshift(this.currentUser);
    }
  }

  async updateFilteredResults(): Promise<void> {
    const results = await this.searchService.updateFilteredResults(
      this.searchTerm, this.gastLogin, this.directMessages, this.currentLoginId
    );
    this.filteredChannels = results.channels;
    if (this.gastLogin) {
      this.filteredDirectMessagesGuests = results.directMessages as DirectMessage[];
    } else {
      this.filteredDirectMessagesUsers = results.directMessages as appUser[];
    }
    this.filteredMessagesFromChannels = results.contentResults;
    this.filteredMessagesFromDirectMessages = results.directMessageResults;
  }

  selectChannel(channel: Channel): void {
    if (!channel?.channelId) return;
    this.channelDirectMessageData.setSelectedChannel(channel);
    this.closeNewMessage.emit();
    if (window.innerWidth < 800 || !this.chatSelected.observers.length) {
      this.router.navigate(['/chat-container', 'channel', channel.channelId]);
      return;
    }
    this.chatSelected.emit(channel.channelId);
    this.chatTypeSelected.emit('channel');
    this.searchTerm = '';
  }

  selectDirectMessage(user: appUser): void {
    if (!user?.id || !this.currentUser?.id) return;
    const conv = this.findConversation(user.id, this.currentUser.id);
    if (!conv?.id) return;
    this.channelDirectMessageData.setSelectedDirectMessage(user);
    this.closeNewMessage.emit();

    if (window.innerWidth < 800) this.router.navigate(['/chat-container', 'conversation', conv.id]);
    else { this.chatTypeSelected.emit('conversation'); this.chatSelected.emit(conv.id); }

    this.searchTerm = '';
  }

  findConversation(userId1: string, userId2: string) {
    return this.directMessages.find(conv => {
      const participants: string[] = conv.members || conv.participants;
      return participants.sort().join() === [userId1, userId2].sort().join();
    }) || null;
  }

  selectDirectMessageGast(user: DirectMessage): void {
    this.router.navigate(['/chat', user.name]);
  }

  selectDirectMessageGastFromAppUser(user: appUser): void {
    const dm: DirectMessage = {
      name: user.userName as string,
      img: user.profilePic!.toString(),
      status: user.status ? 'online' : 'offline'
    };
    this.selectDirectMessageGast(dm);
  }


  get isSearchActive(): boolean { return this.searchTerm.trim().length > 0; }

  ngOnDestroy(): void {
    this.unsubCurrentUser?.();
  }
}