import {
  Component,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ChannelsDirectMessageService } from '../../shared/services/channels-direct-message.service';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MessageTemplateComponent } from '../message-template/message-template.component';
import { EmojiPickerComponent } from '../emoji-picker/emoji-picker.component';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  getDoc, 
  serverTimestamp,
} from '@angular/fire/firestore';
import { appUser } from '../../interfaces/user.interface';
import { SessionService } from '../../shared/services/currentUserSession.service';
import { updateDoc } from '@angular/fire/firestore';

interface PickerPosition {
  top: number;
  left: number;
}

@Component({
  selector: 'app-chat-template',
  standalone: true,
  imports: [
    FormsModule,
    MatIconModule,
    MatCardModule,
    CommonModule,
    MessageTemplateComponent,
    EmojiPickerComponent,
  ],
  templateUrl: './chat-template.component.html',
  styleUrl: './chat-template.component.scss',
})
export class ChatTemplateComponent implements OnInit {
  userSession = inject(SessionService);

  @ViewChild('chatField') chatField!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('chatBody') private chatBodyRef!: ElementRef;

mentionableUsers: {
  id: string;
  userName: string;
  profilePic: string;
  status: boolean;
}[] = [];

  mentionPopupVisible = false;

  selectedChannel: any = null;
  chatMessage: string = '';
  messages: any[] = [];
  currentUser: appUser | null = null;

  emojiPickerVisible: boolean = false;
  pickerPosition: PickerPosition = { top: 0, left: 0 };

  editedMessage: any = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private elementRef: ElementRef,
    private channelService: ChannelsDirectMessageService,
    private firestore: Firestore
  ) {}

  async ngOnInit(): Promise<void> {
    this.currentUser = this.userSession.getCurrentUser();

    await this.initializeChannelFromRoute();

    this.channelService.selectedChannel$.subscribe((channel) => {
      this.selectedChannel = channel;
      if (channel) {
        this.loadMessagesForChannel(channel);
      } else {
        this.messages = [];
      }
    });
  }

  private async initializeChannelFromRoute(): Promise<void> {
    const channelId = this.route.snapshot.paramMap.get('id');
    if (!channelId) {
      console.warn('No channel ID in route');
      return;
    }

    try {
      const knownChannels = this.channelService.getChannels();
      const matchedChannel = knownChannels.find(
        (c) => c.channelId === channelId
      );

      if (matchedChannel) {
        this.selectedChannel = matchedChannel;
        this.channelService.setSelectedChannel(matchedChannel);
        this.loadMessagesForChannel(matchedChannel);
      } else {
        const fetchedChannel = await this.channelService.getChannelById(
          channelId
        );
        if (fetchedChannel) {
          this.selectedChannel = fetchedChannel;
          this.channelService.setSelectedChannel(fetchedChannel);
          this.loadMessagesForChannel(fetchedChannel);
        } else {
          console.warn(
            'Channel mit ID nicht gefunden in Firestore:',
            channelId
          );
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden des Channels nach Refresh:', error);
    }
  }

loadMessagesForChannel(channel: any): void {
  if (channel?.channelId) {
    this.channelService.getEnrichedMessages(channel.channelId).subscribe({
      next: (messages) => {
        this.messages = messages;
        this.scrollToBottom();
        this.focusChatInput();  
      },
      error: (error) => {
        console.error('Error loading messages:', error);
      },
    });
  }
}

  navigateToMain(): void {
    this.router.navigate(['/main']);
  }

  toggleEmojiPicker(event: MouseEvent): void {
    event.stopPropagation();
    this.emojiPickerVisible = !this.emojiPickerVisible;

    if (this.emojiPickerVisible) {
      const buttonRect = (event.target as HTMLElement).getBoundingClientRect();
      this.pickerPosition = {
        top: buttonRect.bottom + window.scrollY,
        left: buttonRect.left + window.scrollX,
      };
    }
  }

  addEmoji(emoji: string): void {
    if (this.chatField) {
      const textarea = this.chatField.nativeElement;
      const cursorPos = textarea.selectionStart;
      const textBefore = this.chatMessage.slice(0, cursorPos);
      const textAfter = this.chatMessage.slice(cursorPos);
      this.chatMessage = `${textBefore}${emoji}${textAfter}`;
      textarea.focus();
      setTimeout(() => {
        textarea.setSelectionRange(
          cursorPos + emoji.length,
          cursorPos + emoji.length
        );
      }, 0);
    }
  }

  onPickerClosed() {
  this. emojiPickerVisible = false; 
}

async sendMessage(): Promise<void> {
  if (!this.chatMessage.trim() || !this.selectedChannel?.channelId) {
    console.warn('Message text is empty or channel is not selected.');
    return;
  }

  try {
    const messageText = this.chatMessage.trim();

    if (this.editedMessage) {
      const messageRef = doc(
        this.firestore,
        `channels/${this.selectedChannel.channelId}/messages/${this.editedMessage.id}`
      );

      await updateDoc(messageRef, { text: messageText });
      console.log('Message updated successfully:', messageText);

      this.editedMessage = null;
    } else {
      const messageCollection = collection(
        this.firestore,
        `channels/${this.selectedChannel.channelId}/messages`
      );

      const newMessage = {
        text: messageText,
        timestamp: serverTimestamp(),  
        senderID: this.currentUser?.id!,
        channelId: this.selectedChannel.channelId,
      };

      await addDoc(messageCollection, newMessage);
      console.log('Message sent successfully:', newMessage);
    }

    this.chatMessage = '';
  } catch (error) {
    console.error('Error sending/updating message:', error);
  }
}

  startEditingMessage(message: any): void {
    this.chatMessage = message.text;
    this.editedMessage = message;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const pickerElement = this.elementRef.nativeElement.querySelector(
      '.emoji-picker-panel'
    );
    const buttonElement =
      this.elementRef.nativeElement.querySelector('.chat-buttons');

    if (
      pickerElement &&
      !pickerElement.contains(event.target as Node) &&
      buttonElement &&
      !buttonElement.contains(event.target as Node)
    ) {
      this.emojiPickerVisible = false;
    }
  }

  openChannelInfo(): void {
    const channelId = this.selectedChannel?.channelId;
    if (!channelId) {
      console.warn('Kein Channel ausgewählt');
      return;
    }

    this.router.navigate(['/channel-info', channelId]);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.chatBodyRef) {
        const container = this.chatBodyRef.nativeElement;
        container.scrollTop = container.scrollHeight;
      }
    }, 0);
  }

  focusChatInput(): void {
  if (this.chatField) {
    this.chatField.nativeElement.focus();
  }
}

async checkMentionTrigger(event: KeyboardEvent): Promise<void> {
  const char = event.key;

  if (char === '@') {
    this.mentionPopupVisible = true;
    await this.fetchMentionableUsers();
  } else if (char === ' ' || char === 'Enter' || char === 'Escape') {
    this.mentionPopupVisible = false;
  }

  setTimeout(() => {
    if (!this.chatMessage.includes('@')) {
      this.mentionPopupVisible = false;
    }
  }, 0);
}

  async fetchMentionableUsers(): Promise<void> {
  if (!this.selectedChannel?.channelId) return;

  try {
    const channelDocRef = doc(this.firestore, `channels/${this.selectedChannel.channelId}`);
    const channelDocSnap = await getDoc(channelDocRef);

    if (!channelDocSnap.exists()) {
      console.warn('Channel document does not exist');
      return;
    }

    const channelData = channelDocSnap.data();
    const memberIds: string[] = channelData['members'] || [];

    const userPromises = memberIds.map(async (userId) => {
      const userDocSnap = await getDoc(doc(this.firestore, `users/${userId}`));
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        return {
          id: userId,
          userName: data['userName'],
          profilePic: data['profilePic'] || 'default',
          status: data['status'] ?? false, 
        };
      }
      return null;
    });

    const users = (await Promise.all(userPromises)).filter(Boolean);

    this.mentionableUsers = users as {
      id: string;
      userName: string;
      profilePic: string;
      status: boolean;
    }[];
  } catch (error) {
    console.error('Error fetching mentionable users:', error);
  }
}

selectMentionUser(userName: string): void {
  const textarea = this.chatField?.nativeElement;
  if (!textarea) return;

  const cursorPos = textarea.selectionStart;
  const textBefore = this.chatMessage.slice(0, cursorPos);
  const textAfter = this.chatMessage.slice(cursorPos);

  const atIndex = textBefore.lastIndexOf('@');
  if (atIndex === -1) return;

  const newText =
    textBefore.slice(0, atIndex) + `@${userName} ` + textAfter;

  this.chatMessage = newText;

  const newCursorPos = atIndex + userName.length + 2;
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  });
  this.mentionPopupVisible = false;
}

}
