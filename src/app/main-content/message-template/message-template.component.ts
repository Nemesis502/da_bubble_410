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
import { FirestoreService } from '../../shared/services/firestore.service';
import { take } from 'rxjs';
import {
  MessageParserService,
  TextPart,
} from '../../shared/services/message-parse.service';
import { appUser } from '../../interfaces/user.interface';

@Component({
  selector: 'app-message-template',
  standalone: true,
  imports: [CommonModule, MatIconModule, ReactionPickerComponent],
  templateUrl: './message-template.component.html',
  styleUrls: [
    './message-template.component.scss',
    './message-template.media-query.component.scss',
    './message-template.own.component.scss',
  ],
})
export class MessageTemplateComponent implements OnDestroy, OnChanges {
  @ViewChild('reactionPicker', { read: ElementRef })
  reactionPicker: ElementRef | null = null;

  @Input() messages: any[] = [];
  @Input() chatIsThread: boolean = false;
  @Input() currentUser: string = '';
  @Input() currentChannelId: string | Channel | null = null;
  @Input() currentUserObj: appUser | null = null;
  @Output() editMessage = new EventEmitter<any>();
  @Output() replyToMessage = new EventEmitter<string>();
  parsedMessages: { [id: string]: TextPart[] } = {};
  selectedMessage: any = null;
  activeReactionPickerId: string | null = null;
  private clickListener: (() => void) | null = null;
  reactionsExpanded: { [key: string]: boolean } = {};
  hoveredReactorNames: string[] | null = null;

  /** ---------------- Constructor & Lifecycle ---------------- */

  constructor(
    private elementRef: ElementRef,
    private renderer: Renderer2,
    private directMessageService: ChannelsDirectMessageService,
    private firestoreService: FirestoreService,
    private dialog: MatDialog,
    private parser: MessageParserService
  ) {
    // Global click listener → closes menus and reaction pickers when clicking outside
    this.clickListener = this.renderer.listen(
      'document',
      'click',
      (event: MouseEvent) => this.handleDocumentClick(event)
    );
  }

  /** Reacts to input changes, e.g. when new messages arrive */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['messages'] || changes['currentUserObj']) {
      this.refreshMessages();
      this.sortMessagesByTimestamp();
      this.transformReactionsToEmoji();
      this.addDateHeaders();

      this.messages.forEach((msg) => {
        this.parsedMessages[msg.id || msg.messageID] = this.getParsedMessage(
          msg.text
        );
      });
    }
  }

  /** Clean up listener when component is destroyed */
  ngOnDestroy(): void {
    if (this.clickListener) {
      this.clickListener();
    }
  }

  private refreshMessages() {
    this.messages.forEach((msg) => {
      if (msg.senderID === this.currentUserObj?.id) {
        msg.username = this.currentUserObj?.userName;
        msg.avatar = this.currentUserObj?.profilePic;
      }
    });

    // Re-parse messages for mentions/hashtags
    this.messages.forEach((msg) => {
      this.parsedMessages[msg.id || msg.messageID] = this.getParsedMessage(
        msg.text
      );
    });
  }

  /** ---------------- Message Display Helpers ---------------- */

  /** Ensure messages are sorted chronologically (oldest first) */
  private sortMessagesByTimestamp(): void {
    this.messages.sort((a, b) => {
      const timestampA = new Date(a.timestamp).getTime();
      const timestampB = new Date(b.timestamp).getTime();
      return timestampA - timestampB;
    });
  }

  /** Insert "date header" markers when the day changes between messages */
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

  /** Convert Firestore timestamp object into a Date */
  private convertTimestampToDate(timestamp: any): Date {
    if (timestamp && typeof timestamp.seconds === 'number') {
      return new Date(timestamp.seconds * 1000);
    }
    return new Date(0);
  }

  /** Return "Heute", "Gestern", or a formatted weekday + date string */
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

  /** Helper: check if two Date objects are the same calendar day */
  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /** Format dates older than yesterday with weekday + day + month */
  private formatOlderDate(date: Date): string {
    const weekdays = [
      'Sonntag',
      'Montag',
      'Dienstag',
      'Mittwoch',
      'Donnerstag',
      'Freitag',
      'Samstag',
    ];
    const months = [
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
    return `${weekdays[date.getDay()]}, ${date.getDate()}. ${
      months[date.getMonth()]
    }`;
  }

  /** ---------------- Reactions Handling ---------------- */

  /** Normalize reactions: filter invalid ones, then group & count them */
  /** Prepare and group reactions for all messages */
  private transformReactionsToEmoji(): void {
    // Filter out invalid reactions
    this.messages.forEach((msg) => {
      msg.reactions = Array.isArray(msg.reactions)
        ? msg.reactions.filter((r: any) => r.reactorID)
        : [];
      this.groupMessageReactions(msg);
    });
  }

  /** Group reactions for a single message asynchronously */
  private async groupMessageReactions(message: any): Promise<void> {
    if (!Array.isArray(message.reactions) || message.reactions.length === 0)
      return;
    try {
      message.reactions = await this.groupAndCountReactions(message.reactions);
    } catch {}
  }

  /** Group reactions by emoji and count reactors */
  private async groupAndCountReactions(
    reactions: any[]
  ): Promise<{ reaction: string; count: number; reactors: string[] }[]> {
    const grouped: Record<
      string,
      { reaction: string; count: number; reactors: string[] }
    > = {};

    for (const r of reactions) {
      if (!r.reactorID) continue;
      const name = await this.safeFetchReactorName(r.reactorID);
      if (grouped[r.type]) {
        grouped[r.type].count++;
        grouped[r.type].reactors.push(name);
      } else {
        grouped[r.type] = { reaction: r.type, count: 1, reactors: [name] };
      }
    }

    return Object.values(grouped);
  }

  /** Safely fetch reactor name with fallback */
  private async safeFetchReactorName(reactorID: string): Promise<string> {
    try {
      return await this.fetchReactorName(reactorID);
    } catch {
      return 'Unknown User';
    }
  }

  /** Retrieve display name of user who reacted */
  private fetchReactorName(reactorID: string): Promise<string> {
    return this.directMessageService.fetchReactorName(reactorID);
  }

  /** Expand/collapse reaction list for one message */
  toggleReactions(message: any): void {
    this.reactionsExpanded[message.id] = !this.reactionsExpanded[message.id];
  }

  /** Add or remove a reaction for the current user */
  /** Select a reaction emoji for a message */
async selectReaction(reaction: string, message: any): Promise<void> {
  const channelId = this.resolveChannelId(this.currentChannelId);
  await this.directMessageService.toggleReaction(
    channelId,
    message.messageID || message.id,
    reaction,
    this.currentUser
  );
  if (this.chatIsThread) {
    this.directMessageService.getEnrichedThreadMessages(channelId, message.id)
      .pipe(take(1))
      .subscribe(msgs => this.refreshMessageList(msgs));
  } else {
    const contextType = await this.directMessageService['getContextType'](channelId);
    if (contextType === 'channel') {
      this.directMessageService.getEnrichedMessages(channelId)
        .pipe(take(1))
        .subscribe(msgs => this.refreshMessageList(msgs));
    } else if (contextType === 'conversation') {
      this.directMessageService.getEnrichedConversationMessages(channelId)
        .pipe(take(1))
        .subscribe(msgs => this.refreshMessageList(msgs));
    }
  }
  this.closeAllReactionPickers();
}

// ✅ Centralized helper for refreshing message lists safely
private refreshMessageList(msgs: any[]): void {
  if (Array.isArray(msgs) && msgs.length > 0) {
    this.messages = msgs;
    this.ngOnChanges({
      messages: {
        currentValue: msgs,
        previousValue: [],
        firstChange: false,
        isFirstChange: () => false,
      },
    });
  }
}

  /** Resolve the channel ID from string or Channel object */
  private resolveChannelId(channel: string | Channel | null): string {
    if (!channel) return '';
    return typeof channel === 'string' ? channel : channel.channelId || '';
  }

  /** Return fallback ✅👍 if no reactions, else last two used ones */
  getLastTwoReactions(message: any): string[] {
    if (!message?.reactions || message.reactions.length === 0) {
      return ['✅', '👍'];
    }

    const sortedReactions = [...message.reactions].sort((a, b) => {
      const aTime = a.timestamp?.seconds || 0;
      const bTime = b.timestamp?.seconds || 0;
      return bTime - aTime;
    });

    return sortedReactions.slice(0, 2).map((r) => r.reaction || r.type || '');
  }

  /** ---------------- UI Interaction ---------------- */

  /** Detect clicks outside → close menus & pickers */
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

  /** Toggle reaction picker open/close for a message */
  toggleReactionPicker(message: any, event: MouseEvent): void {
    event.stopPropagation();
    if (this.activeReactionPickerId === message.id) {
      this.activeReactionPickerId = null;
    } else {
      this.closeActiveElements();
      this.activeReactionPickerId = message.id;
    }
  }

  /** Close all open reaction pickers */
  closeAllReactionPickers(): void {
    this.activeReactionPickerId = null;
  }

  /** Reset active menus & deselect any selected message */
  closeActiveElements(): void {
    this.selectedMessage = null;
    this.messages.forEach((msg) => {
      msg.showMoreMenu = false;
    });
  }

  /** Toggle "more" menu for a single message */
  toggleMoreMenu(message: any, event: Event) {
    event.stopPropagation();
    this.messages.forEach((m) => {
      if (m !== message) m.showMoreMenu = false;
    });
    message.showMoreMenu = !message.showMoreMenu;
  }

  /** Select/deselect message when clicked */
  onMessageClick(message: any, event: MouseEvent): void {
    this.closeAllReactionPickers();
    this.closeActiveElements();
    event.stopPropagation();
    this.selectedMessage = this.selectedMessage === message ? null : message;
  }

  /** ---------------- Message Actions ---------------- */

  /** Emit event to parent to start editing this message */
  onEditClick(message: any): void {
    this.editMessage.emit(message);
  }

  /** Emit event to parent to reply in thread */
  onReplyClick(message: any): void {
    this.replyToMessage.emit(message.id || message.messageID);
  }

  /** Opens the profile dialog for a message sender */
  openUserProfileDialog(message: any): void {
    const loggedUserId = this.currentUser;
    const userId = message.senderID;
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
    this.firestoreService
      .getUserById(userId)
      .pipe(take(1))
      .subscribe((user: any) => {
        if (!user) return;
        this.dialog.open(ProfilDialogComponent, {
          data: {
            user,
            loggedUser: loggedUserId,
            isUser: user.id === loggedUserId,
          },
          panelClass: 'middle-dialog-panel',
        });
      });
  }

  /** ---------------- Reactor Tooltip ---------------- */

  /** Show list of reactor names on hover */
  showReactorNames(reactors: string[], event: MouseEvent): void {
    this.hoveredReactorNames = reactors;
    event.stopPropagation();
  }

  /** Hide reactor names tooltip */
  hideReactorNames(): void {
    this.hoveredReactorNames = null;
  }

  /** Format tooltip string depending on number of reactors */
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
  /** ---------------- Mentions & Hashtags ---------------- */

  /** Use MessageParserService to parse message text */
  getParsedMessage(messageText: string): TextPart[] {
    return this.parser.parseMessageWithMentionsAndHashtags(messageText);
  }
}
