import { Component, Inject, inject, signal, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule, MatChipInputEvent, MatChipEditedEvent } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { FormsModule } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ProfilDialogComponent } from '../../../shared/profil-dialog/profil-dialog.component';
import { AuthService } from '../../../firebase-service/auth.service';
import { SessionService } from '../../../shared/services/currentUserSession.service';
import { appUser } from '../../../interfaces/user.interface';
import { UserService } from '../../../firebase-service/user.services';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { firstValueFrom } from 'rxjs';
import { FirestoreService } from '../../../shared/services/firestore.service';
import { ChannelsDirectMessageService } from '../../../shared/services/channels-direct-message.service';


@Component({
  selector: 'app-menu-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatChipsModule,
    MatAutocompleteModule
  ],
  templateUrl: './menu-dialog.component.html',
  styleUrls: ['./menu-dialog.component.scss']
})
export class MenuDialogComponent implements OnInit {
  @ViewChild('inputField') inputField!: ElementRef<HTMLInputElement>;

  readonly dialog = inject(MatDialog);
  readonly dialogRef = inject(MatDialogRef<MenuDialogComponent>);
  readonly authService = inject(AuthService);
  readonly announcer = inject(LiveAnnouncer);

  readonly firestoreService = inject(FirestoreService);
  readonly channelsDirectMessageService = inject(ChannelsDirectMessageService);

  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  readonly peoples = signal<appUser[]>([]);
  readonly allUsers = signal<appUser[]>([]);
  readonly filteredUsers = signal<appUser[]>([]);

  currentUser: appUser | null = null;
  searchTerm = '';
  isActive = true;
  isProfilHovered = false;
  autocompleteIsOpen = false;
  isGastLogin = false;

  constructor(
    private router: Router,
    @Inject(MAT_DIALOG_DATA) public data: { source: string }, private userService: UserService, private userSession: SessionService
  ) {
    this.currentUser = this.userSession.getCurrentUser();
  }

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  private async loadUsers(): Promise<void> {
    if (this.isGastLogin) {
      const guestUsers = this.channelsDirectMessageService.getDirectMessages().map(dm => ({
        userName: dm.name,
        profilePic: parseInt(dm.img.replace('.png', ''), 10) || 0,
        status: dm.status === 'online',
        email: ''
      }));
      this.allUsers.set(guestUsers);
      this.filteredUsers.set(guestUsers);
    } else {
      const usersFromFirestore = await firstValueFrom(this.firestoreService.getUsers());
      const users: appUser[] = usersFromFirestore.map((u: any) => ({
        userName: u.userName,
        profilePic: u.profilePic,
        status: u.status,
        email: u.email
      }));
      this.allUsers.set(users);
      this.filteredUsers.set(users);
    }
  }



  openProfileDialog() {
    this.closeDialog();
    this.dialog.open(ProfilDialogComponent, {
      maxWidth: '90vw',
      panelClass: 'bottom-dialog-panel',

    });
  }

  logout() {
    console.log(this.currentUser);
    this.authService.logout().then(() => {
      this.userService.updateUserStatusFalse(this.currentUser?.id!)
      this.router.navigate(['/']);
    });
    this.closeDialog();
  }

  closeDialog() {
    this.dialogRef.close();
  }

  toggleActive(isActive: boolean): void {
    this.isActive = isActive;
  }

  filterUsers() {
    const query = typeof this.searchTerm === 'string' ? this.searchTerm.toLowerCase() : '';
    this.filteredUsers.set(
      this.allUsers().filter(user =>
        user.userName.toLowerCase().startsWith(query) &&
        !this.peoples().some(p => p.userName === user.userName)
      )
    );
  }

  selectUser(user: appUser) {
    if (!this.peoples().some(p => p.userName === user.userName)) {
      this.peoples.update(peoples => [...peoples, user]);
    }

    this.searchTerm = '';
    this.filteredUsers.set(this.allUsers());

    setTimeout(() => {
      if (this.inputField) {
        this.inputField.nativeElement.value = '';
        this.inputField.nativeElement.focus();
      }
    }, 0);
  }

  addFromText(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (!value) return;

    const match = this.allUsers().find(u => u.userName.toLowerCase() === value.toLowerCase());
    if (match && !this.peoples().some(p => p.userName === match.userName)) {
      this.peoples.update(peoples => [...peoples, match]);
    }

    this.searchTerm = '';
    this.filteredUsers.set(this.allUsers());

    event.chipInput?.clear();

    setTimeout(() => this.inputField?.nativeElement.focus(), 0);
  }

  onInputBlur(): void {
    setTimeout(() => {
      const val = this.searchTerm.trim();
      if (!val) return;

      const match = this.allUsers().find(u => u.userName.toLowerCase() === val.toLowerCase());
      if (match && !this.peoples().some(p => p.userName === match.userName)) {
        this.peoples.update(peoples => [...peoples, match]);
      }

      this.searchTerm = '';
      this.filteredUsers.set(this.allUsers());
    }, 150);
  }

  remove(people: appUser): void {
    this.peoples.update(peoples => peoples.filter(p => p !== people));
    this.announcer.announce(`Removed ${people.userName}`);
  }

  edit(people: appUser, event: MatChipEditedEvent) {
    const value = event.value.trim();
    if (!value) {
      this.remove(people);
      return;
    }

    this.peoples.update(peoples => {
      const index = peoples.indexOf(people);
      if (index >= 0) {
        peoples[index].userName = value;
        return [...peoples];
      }
      return peoples;
    });
  }

  autocompleteOpened() {
    this.autocompleteIsOpen = true;
  }

  autocompleteClosed() {
    this.autocompleteIsOpen = false;
    this.tryAddFromSearchTerm();
  }

  private tryAddFromSearchTerm() {
    const val = this.searchTerm.trim();
    if (!val) return;

    const match = this.allUsers().find(u => u.userName.toLowerCase() === val.toLowerCase());
    if (match && !this.peoples().some(p => p.userName === match.userName)) {
      this.peoples.update(peoples => [...peoples, match]);
    }

    this.searchTerm = '';
    this.filteredUsers.set(this.allUsers());

    setTimeout(() => this.inputField?.nativeElement.focus(), 0);
  }
}