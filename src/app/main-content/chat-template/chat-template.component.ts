import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { ChannelsDirectMessageService } from '../../shared/services/channels-direct-message.service';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MessageTemplateComponent } from '../message-template/message-template.component';
import { EmojiPickerComponent } from '../emoji-picker/emoji-picker.component';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';

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
  selectedChannel: any = null;
  chatMessage: string = '';
  emojiPickerVisible: boolean = false;
  pickerPosition: { top: number; left: number } = { top: 0, left: 0 };
  messages: any[] = [];
  currentUser = 'w7dUBSUFSqZAtEy0GtxG';

  constructor(
    private router: Router,
    private elementRef: ElementRef,
    private channelService: ChannelsDirectMessageService
  ) {}

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
  if (channel && channel.id) {
    this.channelService.getEnrichedMessages(channel.id).subscribe(
      (messages) => {
        console.log('Enriched messages:', messages);
        this.messages = messages; 
      },
      (error) => {
        console.error('Error loading enriched messages:', error);
      }
    );
  }
}

  navigateToMain() {
    this.router.navigate(['/main']);
  }

  toggleEmojiPicker(event: MouseEvent) {
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

  addEmoji(emoji: string) {
    const textarea: HTMLTextAreaElement | null =
      document.querySelector('#chat-field');
    if (textarea) {
      const cursorPos = textarea.selectionStart;
      const textBefore = this.chatMessage.slice(0, cursorPos);
      const textAfter = this.chatMessage.slice(cursorPos);
      this.chatMessage = textBefore + emoji + textAfter;
      textarea.focus();
      setTimeout(() => {
        textarea.setSelectionRange(
          cursorPos + emoji.length,
          cursorPos + emoji.length
        );
      }, 0);
    }
  }

  sendMessage() {
    console.log('Message sent:', this.chatMessage);
    this.chatMessage = '';
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
      !buttonElement.contains(event.target as Node)
    ) {
      this.emojiPickerVisible = false;
    }
  }
}
