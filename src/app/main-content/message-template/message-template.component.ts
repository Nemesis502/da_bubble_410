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
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ReactionPickerComponent } from '../../reaction-picker/reaction-picker.component';
import { Channel } from '../../interfaces/channel.interface';
import { ChannelsDirectMessageService } from '../../shared/services/channels-direct-message.service';
import { MatDialog } from '@angular/material/dialog';
import { ProfilDialogComponent } from '../../shared/dialogs/profil-dialog/profil-dialog.component';
import { appUser } from '../../interfaces/user.interface';

@Component({
  selector: 'app-message-template',
  standalone: true,
  imports: [CommonModule, MatIconModule, ReactionPickerComponent],
  templateUrl: './message-template.component.html',
  styleUrls: ['./message-template.component.scss'],
})
export class MessageTemplateComponent implements OnDestroy, OnChanges {

  @ViewChild('reactionPicker', { read: ElementRef })
  reactionPicker: ElementRef | null = null;

  @Input() messages: any[] = [];
  @Input() chatIsThread: boolean = false;
  @Input() currentUser: string = '';
  @Input() currentChannelId: string | Channel | null = null;

  @Output() editMessage = new EventEmitter<any>();
  @Output() replyToMessage = new EventEmitter<string>();

  selectedMessage: any = null;
  activeReactionPickerId: string | null = null;
  private clickListener: (() => void) | null = null;
  reactionsExpanded: { [key: string]: boolean } = {};
  hoveredReactorNames: string[] | null = null;

/** Constructor and Lifecycle */
  constructor(
    private elementRef: ElementRef,
    private renderer: Renderer2,
    private directMessageService: ChannelsDirectMessageService,
    private dialog: MatDialog
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

  ngOnDestroy(): void {
    if (this.clickListener) {
      this.clickListener();
    }
  }

  /** Message Display Helpers*/

  /** Sort messages by their timestamp ascending */
  private sortMessagesByTimestamp(): void {
    this.messages.sort((a, b) => {
      const timestampA = new Date(a.timestamp).getTime();
      const timestampB = new Date(b.timestamp).getTime();
      return timestampA - timestampB;
    });
  }

  /** Add date headers to messages when date changes */
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

  /** Convert Firestore timestamp to Date object */
  private convertTimestampToDate(timestamp: any): Date {
    if (timestamp && typeof timestamp.seconds === 'number') {
      return new Date(timestamp.seconds * 1000);
    }
    return new Date(0);
  }

  /** Get formatted date string for date headers */
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

  /** Check if two dates fall on the same calendar day */
  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /** Format dates older than yesterday in localized format */
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

  /** Reactions Handling*/

  /** Clean and prepare reactions for messages */
  private transformReactionsToEmoji(): void {
    this.messages = this.messages.map((message) => ({
      ...message,
      reactions: Array.isArray(message.reactions)
        ? message.reactions.filter((reaction: any) => reaction.reactorID)
        : [],
    }));

    // Process grouping asynchronously for each message
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

  /** Group reactions by emoji and count reactors */
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

  /** Fetch the name of the user who reacted */
  private fetchReactorName(reactorID: string): Promise<string> {
    return this.directMessageService.fetchReactorName(reactorID);
  }

  /** Toggle display of reactions for a message */
  toggleReactions(message: any): void {
    this.reactionsExpanded[message.id] = !this.reactionsExpanded[message.id];
  }

  /** Select reaction emoji for a message */
  async selectReaction(reaction: string, message: any): Promise<void> {
    console.log('step 1', message)
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

getLastTwoReactions(message: any): string[] {
  if (!message?.reactions || message.reactions.length === 0) {
    return ['✅', '👍'];
  }

  const sortedReactions = [...message.reactions].sort((a, b) => {
    const aTime = a.timestamp?.seconds || 0;
    const bTime = b.timestamp?.seconds || 0;
    return bTime - aTime;
  });

  const lastTwo = sortedReactions.slice(0, 2).map((r) => r.reaction || r.type || '');

  return lastTwo;
}


  /** UI Interaction Handlers  */

  /** Handle document click to close menus and reaction pickers */
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

  /** Toggle reaction picker visibility for a message */
  toggleReactionPicker(message: any, event: MouseEvent): void {
    event.stopPropagation();
    if (this.activeReactionPickerId === message.id) {
      this.activeReactionPickerId = null;
    } else {
      this.closeActiveElements();
      this.activeReactionPickerId = message.id;
    }
  }

  /** Close all reaction pickers */
  closeAllReactionPickers(): void {
    this.activeReactionPickerId = null;
  }

  /** Close any active menus and deselect messages */
  closeActiveElements(): void {
    this.selectedMessage = null;
    this.messages.forEach((msg) => {
      msg.showMoreMenu = false;
    });
  }

  /** Toggle more menu for a specific message */
  toggleMoreMenu(message: any, event: Event) {
    event.stopPropagation();
    this.messages.forEach((m) => {
      if (m !== message) m.showMoreMenu = false;
    });
    message.showMoreMenu = !message.showMoreMenu;
  }

  /** Handle clicking on a message */
  onMessageClick(message: any, event: MouseEvent): void {
    this.closeAllReactionPickers();
    this.closeActiveElements();
    event.stopPropagation();
    this.selectedMessage = this.selectedMessage === message ? null : message;
  }

  /** Message Actions  */

  /** Emit edit message event */
  onEditClick(message: any): void {
    this.editMessage.emit(message);
  }

  /** Emit reply to message event */
  onReplyClick(message: any): void {
    this.replyToMessage.emit(message.id || message.messageID);
  }

  /** Open user profile dialog */
  openUserProfileDialog(message: any): void {
    const user: appUser = {
      id: message.senderID,
      userName: message.username,
      email: message.email || '',
      profilePic: message.avatar || 0,
      status: message.status ?? true,
    };
    const loggedUser = this.currentUser;

    this.dialog.open(ProfilDialogComponent, {
      data: {
        user: user,
        loggedUser,
        isUser: false,
      },
      panelClass: 'bottom-dialog-panel',
    });
  }

  /**Reactor Names Tooltip */

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
      return `${reactors[0]} und<br> ${reactors[1]}<br>haben reagiert`;
    } else {
      const othersCount = reactors.length - 1;
      return `${reactors[0]} und ${othersCount} weitere<br>haben reagiert`;
    }
  }

  /**Mentions and Hashtags Parsing */

  /**
   * Parses message text to split out mentions and hashtags
   * Returns array with text segments flagged as mentions or hashtags
   */
  parseMessageWithMentionsAndHashtags(
    messageText: string
  ): { text: string; isMention: boolean; isHashtag: boolean }[] {
    const mentionParts = this.parseMentions(messageText);
    return this.parseHashtags(mentionParts);
  }

  /** Parses mentions (e.g. @username) */
  parseMentions(
    messageText: string
  ): { text: string; isMention: boolean; isHashtag: boolean }[] {
    const mentionRegex = /@[\wäöüÄÖÜß]+(?: [\wäöüÄÖÜß]+)*(?=\s|$|[.,!?:])/g;
    const parts: { text: string; isMention: boolean; isHashtag: boolean }[] =
      [];
    let lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(messageText)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          text: messageText.slice(lastIndex, match.index),
          isMention: false,
          isHashtag: false,
        });
      }
      parts.push({ text: match[0], isMention: true, isHashtag: false });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < messageText.length) {
      parts.push({
        text: messageText.slice(lastIndex),
        isMention: false,
        isHashtag: false,
      });
    }

    return parts;
  }

  /** Parses hashtags (e.g. #topic) */
  parseHashtags(
    parts: { text: string; isMention: boolean; isHashtag: boolean }[]
  ): { text: string; isMention: boolean; isHashtag: boolean }[] {
    const hashtagRegex = /#[\wäöüÄÖÜß]+/g;
    const newParts: { text: string; isMention: boolean; isHashtag: boolean }[] =
      [];

    parts.forEach((part) => {
      if (part.isMention) {
        newParts.push(part);
      } else {
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = hashtagRegex.exec(part.text)) !== null) {
          if (match.index > lastIndex) {
            newParts.push({
              text: part.text.slice(lastIndex, match.index),
              isMention: false,
              isHashtag: false,
            });
          }
          newParts.push({
            text: match[0],
            isMention: false,
            isHashtag: true,
          });
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < part.text.length) {
          newParts.push({
            text: part.text.slice(lastIndex),
            isMention: false,
            isHashtag: false,
          });
        }
      }
    });

    return newParts;
  }
}
