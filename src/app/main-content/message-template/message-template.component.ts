import {
  Component,
  ElementRef,
  Renderer2,
  HostListener,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ReactionPickerComponent } from '../../reaction-picker/reaction-picker.component';

@Component({
  selector: 'app-message-template',
  standalone: true,
  imports: [CommonModule, MatIconModule, ReactionPickerComponent],
  templateUrl: './message-template.component.html',
  styleUrl: './message-template.component.scss',
})
export class MessageTemplateComponent implements OnDestroy {
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
      reactions: [],
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
      reactions: [],
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
      reactions: [],
    },
  ];

  currentUser: string = 'user2';
  selectedMessage: any = null;
  pickerVisible: boolean = false;
  pickerPosition: { top: number; left: number } = { top: 0, left: 0 };
  private clickListener: (() => void) | null = null;

  constructor(private elementRef: ElementRef, private renderer: Renderer2) {
    this.clickListener = this.renderer.listen(
      'document',
      'click',
      (event: MouseEvent) => this.handleDocumentClick(event)
    );
  }

  togglePopup(message: any, event: MouseEvent): void {
    event.stopPropagation();
    if (this.selectedMessage !== message) {
      this.closeActiveElements();
    }
    this.selectedMessage = message;
  }

  togglePicker(event: MouseEvent): void {
    const button = event.target as HTMLElement;
    const rect = button.getBoundingClientRect();

    this.pickerPosition = {
      top: rect.top + window.scrollY + rect.height,
      left: rect.left + rect.width / 2 - 102, // Center picker (204px wide)
    };

    this.pickerVisible = !this.pickerVisible;
    event.stopPropagation();
  }

handleDocumentClick(event: MouseEvent): void {
  const popupElement = this.elementRef.nativeElement.querySelector(
    '.popup-menu, .popup-menu-own'
  );
  const pickerElement = this.elementRef.nativeElement.querySelector(
    '.reaction-picker-panel'
  );

  if (
    (!popupElement || !popupElement.contains(event.target as Node)) &&
    (!pickerElement || !pickerElement.contains(event.target as Node))
  ) {
    this.closeActiveElements();
  }
}

  closeActiveElements(): void {
    this.selectedMessage = null;
    this.pickerVisible = false;
  }

  selectReaction(reaction: string): void {
    console.log('Selected reaction:', reaction);
    this.pickerVisible = false;
  }

  ngOnDestroy(): void {
    if (this.clickListener) {
      this.clickListener();
    }
  }

  onMessageClick(message: any, event: MouseEvent): void {
    this.closeActiveElements();
    event.stopPropagation();
    this.selectedMessage = this.selectedMessage === message ? null : message;
  }
}
