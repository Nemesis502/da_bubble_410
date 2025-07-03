import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ChannelsDirectMessageService } from '../../shared/services/channels-direct-message.service';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
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
  serverTimestamp,
} from '@angular/fire/firestore';

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
  @ViewChild('chatField') chatField!: ElementRef<HTMLTextAreaElement>;
  selectedChannel: any = null;
  chatMessage: string = '';
  emojiPickerVisible: boolean = false;
  pickerPosition: PickerPosition = { top: 0, left: 0 };
  messages: any[] = [];
  currentUser: string = 'w7dUBSUFSqZAtEy0GtxG';

  constructor(
    private router: Router,
    private elementRef: ElementRef,
    private channelService: ChannelsDirectMessageService,
    private firestore: Firestore
  ) { }

  ngOnInit(): void {
    this.channelService.selectedChannel$.subscribe((channel) => {
      this.selectedChannel = channel;
      if (channel) {
        this.loadMessagesForChannel(channel);
      } else {
        this.messages = [];
      }
    });
  }

  loadMessagesForChannel(channel: any): void {
    console.log('Loading messages for channel:', channel);
    if (channel?.channelId) {
      this.channelService.getEnrichedMessages(channel.channelId).subscribe({
        next: (messages) => {
          this.messages = messages;
        },
        error: (error) => {
          console.error(
            'Error loading enriched messages with reactions:',
            error
          );
        },
      });
    } else {
      console.warn('Channel ID missing:', channel);
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

  async sendMessage(): Promise<void> {
    if (!this.chatMessage.trim() || !this.selectedChannel?.channelId) {
      console.warn('Message text is empty or channel is not selected.');
      return;
    }

    try {
      const messageCollection = collection(
        this.firestore,
        `channels/${this.selectedChannel.channelId}/messages`
      );

      const newMessage = {
        text: this.chatMessage.trim(),
        timestamp: serverTimestamp(),
        senderID: this.currentUser,
        channelId: this.selectedChannel.channelId,
      };

      await addDoc(messageCollection, newMessage);
      console.log('Message sent successfully:', newMessage);
      this.chatMessage = '';
    } catch (error) {
      console.error('Error sending message:', error);
    }
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
}
