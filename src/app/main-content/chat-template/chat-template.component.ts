import { Component, ElementRef, HostListener } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MessageTemplateComponent } from '../message-template/message-template.component';
import { EmojiPickerComponent } from '../emoji-picker/emoji-picker.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-chat-template',
  standalone: true,
  imports: [
    MatIconModule,
    MatCardModule,
    CommonModule,
    MessageTemplateComponent,
    EmojiPickerComponent
],
  templateUrl: './chat-template.component.html',
  styleUrl: './chat-template.component.scss',
})
export class ChatTemplateComponent {

    chatMessage: string = '';
  emojiPickerVisible: boolean = false;
  pickerPosition: { top: number; left: number } = { top: 0, left: 0 };

  constructor(private router: Router,private elementRef: ElementRef) {}

  navigateToMain() {
    this.router.navigate(['/main']);
  }

toggleEmojiPicker(event: MouseEvent) {
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
    this.chatMessage += emoji;
  }

  sendMessage() {
    console.log('Message sent:', this.chatMessage);
    this.chatMessage = '';
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.emojiPickerVisible = false;
    }
  }
}
