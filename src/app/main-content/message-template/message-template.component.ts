import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatCardModule} from '@angular/material/card';

@Component({
  selector: 'app-message-template',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './message-template.component.html',
  styleUrl: './message-template.component.scss',
})
export class MessageTemplateComponent {
  messages = [
    {
      id: 'user1',
      name: 'Example Name',
      time: '12:00 Uhr',
      text: 'I created this channel for you!',
      date: 'Example, Date',
      avatar: './assets/img/avatar/1.png',
      answersCount: 2,
      lastAnswerTime: '12:05 Uhr',
    },
    {
      id: 'user2',
      name: 'Example Name',
      time: '12:05 Uhr',
      text: 'Hi! Thanks for creating a Channel for us!',
      date: 'Example, Date',
      avatar: './assets/img/avatar/3.png',
      answersCount: 0,
      lastAnswerTime: '12:10 Uhr',
    },
    {
      id: 'user3',
      name: 'Example Name',
      time: '12:10 Uhr',
      text: 'Thank you!',
      date: 'Example, Date',
      avatar: './assets/img/avatar/2.png',
      answersCount: 2,
      lastAnswerTime: '12:15 Uhr',
    },
  ];

  currentUser: string = 'user2';
  selectedMessage: any = null;
  popupPosition: { top: string; left: string } | null = null;
  popupType: 'own' | 'other' | null = null;

  onMsgClick(message: any, event: MouseEvent) {
    this.selectedMessage = this.selectedMessage === message ? null : message;
    if (this.selectedMessage) {
      const targetElement = event.currentTarget as HTMLElement;
      const rect = targetElement.getBoundingClientRect();

      this.popupType = 'other';
      this.popupPosition = {
        top: `${rect.top + 15}px`,
        left: `${rect.left + rect.width / 2}px`,
      };
    } else {
      this.popupType = null;
      this.popupPosition = null;
    }
    event.stopPropagation();
  }

  onMsgClickForOwnMessage(message: any, event: MouseEvent) {
    this.selectedMessage = this.selectedMessage === message ? null : message;
    if (this.selectedMessage) {
      const targetElement = event.currentTarget as HTMLElement;
      const rect = targetElement.getBoundingClientRect();

      this.popupType = 'own';
      this.popupPosition = {
        top: `${rect.top + 15}px`,
        left: `${rect.left + rect.width / 2}px`,
      };
    } else {
      this.popupType = null;
      this.popupPosition = null;
    }
    event.stopPropagation();
  }

  replyToMessage(message: any) {
    console.log('Replying to:', message);
  }

  editMessage(message: any) {
    console.log('Editing:', message);
  }

  deleteMessage(message: any) {
    console.log('Deleting:', message);
  }
}
