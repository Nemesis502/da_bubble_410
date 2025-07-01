import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FirestoreService } from '../../shared/services/firestore.service';
import { updateDoc } from 'firebase/firestore';
import { Channel } from '../../interfaces/channel.interface';
import { appUser } from '../../interfaces/user.interface';
import { firstValueFrom } from 'rxjs';
import { TextFieldModule } from '@angular/cdk/text-field';

@Component({
  selector: 'app-channel-info',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatButtonModule, 
    MatIconModule, 
    FormsModule,
    TextFieldModule
  ],
  templateUrl: './channel-info.component.html',
  styleUrl: './channel-info.component.scss',
})
export class ChannelInfoComponent implements OnInit {
  readonly firestoreService = inject(FirestoreService);
  readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  readonly document = inject(DOCUMENT);

  channelId = '';
  channel: Channel | null = null;
  members = signal<appUser[]>([]);
  currentUser: appUser | null = null;

  creatorName = '';
  channelNameInput = '';
  newChannelName = '';
  channelDescriptionInput = '';
  newChannelDescription = '';

  editName = false;
  editDescription = false;

  async ngOnInit(): Promise<void> {
    this.channelId = this.route.snapshot.paramMap.get('id') || '';
    await this.loadChannel();
    await this.loadMembers();
  }

  async loadChannel(): Promise<void> {
    const channels = await firstValueFrom(this.firestoreService.getChannels());
    const found = channels.find(c => c.channelId === this.channelId);

    if (found) {
      this.channel = found;
      this.channelNameInput = found.name;
      this.channelDescriptionInput = found.description || '';
      await this.loadCreator(found.createdBy);
    }
  }

  async loadCreator(userId: string): Promise<void> {
    if (!userId) return;
    const data = await firstValueFrom(this.firestoreService.getUserById(userId));
    this.creatorName = (data as appUser).userName;
  }

  async loadMembers(): Promise<void> {
    const users = await firstValueFrom(this.firestoreService.getUsers());
    const memberList = users.filter((user: appUser) =>
      this.channel?.members.includes(user.id!)
    );
    this.members.set(memberList);
  }

  async saveName(): Promise<void> {
    if (!this.channelId || !this.newChannelName?.trim()) return;

    const ref = this.firestoreService.getChannelDocRef(this.channelId);
    this.channelNameInput = this.newChannelName.trim();
    await updateDoc(ref, { name: this.channelNameInput });
    this.editName = false;
    this.newChannelName = '';
    await this.loadChannel();
  }

  async saveDescription(): Promise<void> {
    if (!this.channelId || !this.newChannelDescription?.trim()) return;

    const ref = this.firestoreService.getChannelDocRef(this.channelId);
    this.channelDescriptionInput = this.newChannelDescription.trim();
    await updateDoc(ref, { description: this.channelDescriptionInput });
    this.editDescription = false;
    this.newChannelDescription = '';
    await this.loadChannel();
  }

  openAddPeopleDialog(): void {
    // Dialog öffnen
  }

  async leaveChannel(): Promise<void> {
    if (!this.channel || !this.currentUser?.id) return;
    const updatedMembers = this.channel.members.filter(id => id !== this.currentUser!.id);
    const ref = this.firestoreService.getChannelDocRef(this.channelId);
    await updateDoc(ref, { members: updatedMembers });
    this.router.navigate(['/']);
  }

  close(): void {
    this.router.navigate(['/main']);
  }
}
