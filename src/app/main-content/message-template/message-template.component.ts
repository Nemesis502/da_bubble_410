import {
  Component,
  ElementRef,
  Renderer2,
  OnDestroy,
  ViewChild,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
  EventEmitter 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ReactionPickerComponent } from '../../reaction-picker/reaction-picker.component';
import { Channel } from '../../interfaces/channel.interface';
import { ChannelsDirectMessageService } from '../../shared/services/channels-direct-message.service';
import { formatDate } from '@angular/common';

@Component({
  selector: 'app-message-template',
  standalone: true,
  imports: [CommonModule, MatIconModule, ReactionPickerComponent],
  templateUrl: './message-template.component.html',
  styleUrl: './message-template.component.scss',
})
export class MessageTemplateComponent implements OnDestroy, OnChanges {
  @ViewChild('reactionPicker', { read: ElementRef })
  reactionPicker: ElementRef | null = null;
  @Input() messages: any[] = [];
  @Input() currentUser: string = 'w7dUBSUFSqZAtEy0GtxG';
  @Input() currentChannelId: string | Channel | null = null;
  @Output() editMessage = new EventEmitter<any>();

  selectedMessage: any = null;
  activeReactionPickerId: string | null = null;
  private clickListener: (() => void) | null = null;
  reactionsExpanded: { [key: string]: boolean } = {};
  hoveredReactorNames: string[] | null = null;

  constructor(
    private elementRef: ElementRef,
    private renderer: Renderer2,
    private directMessageService: ChannelsDirectMessageService
  ) {
    this.clickListener = this.renderer.listen(
      'document',
      'click',
      (event: MouseEvent) => this.handleDocumentClick(event)
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['messages']) {
      this.sortMessagesByTimestamp();
      this.transformReactionsToEmoji();
      this.addDateHeaders(); 
    }
  }

  
onEditClick(message: any): void {
  this.editMessage.emit(message);
}

private addDateHeaders(): void {
  let lastMessageDate: string | null = null;

  this.messages.forEach((message) => {
    const messageDate = this.convertTimestampToDate(message.timestamp);
    const formattedDate = this.getFormattedDate(messageDate);

    if (lastMessageDate !== formattedDate) {
      message.showDateHeader = true;
      message.date = formattedDate; 
      lastMessageDate = formattedDate;
    } else {
      message.showDateHeader = false;
    }
  });
}

private getFormattedDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (this.isSameDay(date, today)) {
    return 'Heute';
  } else if (this.isSameDay(date, yesterday)) {
    return 'Gestern';
  } else {
    return this.formatOlderDate(date);
  }
}

private isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

private formatOlderDate(date: Date): string {
  const dayNames = [
    'Sonntag',
    'Montag',
    'Dienstag',
    'Mittwoch',
    'Donnerstag',
    'Freitag',
    'Samstag',
  ];
  const monthNames = [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
  ];

  const weekday = dayNames[date.getDay()];
  const day = date.getDate();
  const month = monthNames[date.getMonth()];

  return `${weekday}, ${day}. ${month}`;
}

  private convertTimestampToDate(timestamp: any): Date {
  if (timestamp && typeof timestamp.seconds === 'number') {
    return new Date(timestamp.seconds * 1000); 
  }
  console.error('Invalid timestamp:', timestamp);
  return new Date(0); 
}

  private sortMessagesByTimestamp(): void {
    this.messages.sort((a, b) => {
      const timestampA = new Date(a.timestamp).getTime();
      const timestampB = new Date(b.timestamp).getTime();
      return timestampA - timestampB;
    });
  }

  private transformReactionsToEmoji(): void {
    this.messages = this.messages.map((message) => ({
      ...message,
      reactions: Array.isArray(message.reactions)
        ? message.reactions.filter((reaction: any) => reaction.reactorID)
        : [],
    }));

    this.messages.forEach(async (message) => {
      if (Array.isArray(message.reactions)) {
        try {
          const groupedReactions = await this.groupAndCountReactions(
            message.reactions
          );
          message.reactions = groupedReactions;
        } catch (error) {
          console.error('Error processing message reactions:', error);
        }
      }
    });
  }

  private async groupAndCountReactions(
    reactions: any[]
  ): Promise<{ reaction: string; count: number; reactors: string[] }[]> {
    const groupedReactions: {
      [key: string]: { reaction: string; count: number; reactors: string[] };
    } = {};

    for (const reaction of reactions) {
      const emoji = reaction.type;

      if (!reaction.reactorID) {
        console.warn('Skipping reaction with missing reactorID:', reaction);
        continue;
      }

      let reactorName: string;
      try {
        reactorName = await this.fetchReactorName(reaction.reactorID);
      } catch (error) {
        console.error(
          'Error fetching reactor name for',
          reaction.reactorID,
          error
        );
        reactorName = 'Unknown User';
      }

      if (groupedReactions[emoji]) {
        groupedReactions[emoji].count += 1;
        groupedReactions[emoji].reactors.push(reactorName);
      } else {
        groupedReactions[emoji] = {
          reaction: emoji,
          count: 1,
          reactors: [reactorName],
        };
      }
    }

    return Object.values(groupedReactions);
  }

  private fetchReactorName(reactorID: string): Promise<string> {
    return this.directMessageService.fetchReactorName(reactorID);
  }

  toggleReactions(message: any): void {
    this.reactionsExpanded[message.id] = !this.reactionsExpanded[message.id];
  }

  handleDocumentClick(event: MouseEvent): void {
    const clickedElement = event.target as Node;
    const isClickInsideComponent =
      this.elementRef.nativeElement.contains(clickedElement);
    const isClickInsidePicker =
      this.reactionPicker &&
      this.reactionPicker.nativeElement.contains(clickedElement);

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
  this.messages.forEach((msg) => {
    msg.showMoreMenu = false;
  });
}

  async selectReaction(reaction: string, message: any): Promise<void> {
    try {
      let channelId: string;

      if (typeof this.currentChannelId === 'string') {
        channelId = this.currentChannelId;
      } else if (
        this.currentChannelId &&
        'channelId' in this.currentChannelId
      ) {
        channelId = this.currentChannelId.channelId || '';
      } else {
        channelId = '';
      }

      await this.directMessageService.toggleReaction(
        channelId,
        message.messageID || message.id,
        reaction,
        this.currentUser
      );
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
    this.closeAllReactionPickers();
  }

  onMessageClick(message: any, event: MouseEvent): void {
    this.closeAllReactionPickers();
    this.closeActiveElements();
    event.stopPropagation();
    this.selectedMessage = this.selectedMessage === message ? null : message;
  }

  showReactorNames(reactors: string[], event: MouseEvent): void {
    this.hoveredReactorNames = reactors;
    event.stopPropagation();
  }

  hideReactorNames(): void {
    this.hoveredReactorNames = null;
  }

  formatReactorNames(reactors: string[] | null): string {
    if (!reactors || reactors.length === 0) return '';

    if (reactors.length === 1) {
      return `${reactors[0]}<br>hat reagiert`;
    } else if (reactors.length === 2) {
      return `${reactors[0]} und ${reactors[1]}<br>haben reagiert`;
    } else {
      const othersCount = reactors.length - 1;
      return `${reactors[0]} und ${othersCount} weitere<br>haben reagiert`;
    }
  }

  ngOnDestroy(): void {
    if (this.clickListener) {
      this.clickListener();
    }
  }

  toggleMoreMenu(message: any, event: Event) {
  event.stopPropagation(); 
  this.messages.forEach(m => {
    if (m !== message) m.showMoreMenu = false;
  });
  message.showMoreMenu = !message.showMoreMenu;
}
}
