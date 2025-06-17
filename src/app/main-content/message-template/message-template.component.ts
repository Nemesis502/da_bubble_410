import {
  Component,
  ElementRef,
  Renderer2,
  HostListener,
  OnDestroy,
  ViewChild,
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
   @ViewChild('reactionPicker', { read: ElementRef }) reactionPicker: ElementRef | null = null;
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
          reactions: [
      { reaction: '👍', count: 1 },
      { reaction: '❤️', count: 2 },
    ],
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
  activeReactionPickerId: string | null = null;
  private clickListener: (() => void) | null = null;

  constructor(private elementRef: ElementRef, private renderer: Renderer2) {
    this.clickListener = this.renderer.listen(
      'document',
      'click',
      (event: MouseEvent) => this.handleDocumentClick(event)
    );
  }

  handleDocumentClick(event: MouseEvent): void {
    const clickedElement = event.target as Node;
    const isClickInsideComponent = this.elementRef.nativeElement.contains(clickedElement);
    const isClickInsidePicker =
      this.reactionPicker && this.reactionPicker.nativeElement.contains(clickedElement);

    if (!isClickInsideComponent && !isClickInsidePicker) {
      this.closeActiveElements();
      this.closeAllReactionPickers();
    }
  }

  toggleReactionPicker(message: any, event: MouseEvent): void {
    event.stopPropagation();
    if (this.activeReactionPickerId === message.id) {
      this.activeReactionPickerId = null;
    } else {
      this.closeActiveElements();
      this.activeReactionPickerId = message.id;
    }
  }

  closeAllReactionPickers(): void {
    this.activeReactionPickerId = null;
  }

  closeActiveElements(): void {
    this.selectedMessage = null;
  }

selectReaction(reaction: string, message: any): void {
  const existingReaction = message.reactions.find((r: any) => r.reaction === reaction);
  if (existingReaction) {
    existingReaction.count += 1;
  } else {
    message.reactions.push({ reaction, count: 1 });
  }

  this.closeAllReactionPickers();
}
  onMessageClick(message: any, event: MouseEvent): void {
    this.closeAllReactionPickers()
    this.closeActiveElements();
    event.stopPropagation();
    this.selectedMessage = this.selectedMessage === message ? null : message;
  }

  ngOnDestroy(): void {
    if (this.clickListener) {
      this.clickListener();
    }
  }
}
