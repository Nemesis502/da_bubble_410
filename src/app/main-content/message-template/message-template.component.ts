import { 
  Component,
  ElementRef,
  Renderer2,
  HostListener,
  OnDestroy,
  ViewChild,
  Input, 
  OnChanges,
  SimpleChanges
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
export class MessageTemplateComponent implements OnDestroy, OnChanges {
  @ViewChild('reactionPicker', { read: ElementRef }) reactionPicker: ElementRef | null = null;
  @Input() messages: any[] = [];
  @Input() currentUser: string = 'w7dUBSUFSqZAtEy0GtxG';

  selectedMessage: any = null;
  activeReactionPickerId: string | null = null;
  private clickListener: (() => void) | null = null;
  reactionsExpanded: { [key: string]: boolean } = {}; 

private reactionEmojiMap: Record<string, string> = {
  grinning: '😀',
  beaming: '😁',
  joy: '😂',
  rofl: '🤣',
  smilingOpen: '😃',
  smiling: '😄',
  sweatSmile: '😅',
  laughing: '😆',
  wink: '😉',
  blush: '😊',
  yum: '😋',
  cool: '😎',
  heartEyes: '😍',
  kiss: '😘',
  kissing: '😗',
  kissingSmiling: '😙',
  kissingClosedEyes: '😚',
  slightSmile: '🙂',
  hugging: '🤗',
  thinking: '🤔',
  neutral: '😐',
  expressionless: '😑',
  noMouth: '😶',
  rollingEyes: '🙄',
  smirk: '😏',
  persevering: '😣',
  disappointedRelieved: '😥',
  openMouth: '😮',
  zipperMouth: '🤐',
  hushed: '😯',
  sleepy: '😪',
  tired: '😫',
  sleeping: '😴',
  relieved: '😌',
  stuckOutTongue: '😛',
  stuckOutTongueWinking: '😜',
  stuckOutTongueClosedEyes: '😝',
  drooling: '🤤',
  unamused: '😒',
  sweat: '😓',
  pensive: '😔',
  confused: '😕',
  upsideDown: '🙃',
  moneyMouth: '🤑',
  astonished: '😲',
  frowning: '☹️',
  slightlyFrowning: '🙁',
  confounded: '😖',
  disappointed: '😞',
  worried: '😟',
  angry: '😤',
  crying: '😢',
  loudlyCrying: '😭',
  frowningOpenMouth: '😦',
  anguished: '😧',
  fearful: '😨',
  weary: '😩',
  explodingHead: '🤯',
  grimacing: '😬',
  coldSweat: '😰',
  scream: '😱',
  hotFace: '🥵',
  coldFace: '🥶',
  flushed: '😳',
  zanyFace: '🤪',
  dizzyFace: '😵',
  enraged: '😡',
  angryFace: '😠',
  faceWithSymbols: '🤬',
  faceWithMedicalMask: '😷',
  faceWithThermometer: '🤒',
  faceWithHeadBandage: '🤕',
  nauseated: '🤢',
  vomiting: '🤮',
  sneezing: '🤧',
  smilingHalo: '😇',
  cowboy: '🤠',
  partying: '🥳',
  disguised: '🥸',
  sunglasses: '😎',
  nerdFace: '🤓',
  monocle: '🧐',
  confusedFace: '😕',
  nose: '👃',
  ear: '👂',
  earWithHearingAid: '🦻',
  leg: '🦶',
  foot: '🦵',
  mechanicalLeg: '🦿',
  mechanicalArm: '🦾',
  flexedBiceps: '💪',
  thumbsUp: '👍',
  thumbsDown: '👎',
  clappingHands: '👏',
  heartHands: '🫶',
  raisedHands: '🙌',
  openHands: '👐',
  palmsUpTogether: '🤲',
  handshake: '🤝',
  punchRight: '🤜',
  punchLeft: '🤛',
  raisedFist: '✊',
  oncomingFist: '👊',
  palmDown: '🫳',
  palmUp: '🫴',
  palmRight: '🫱',
  palmLeft: '🫲',
  raisedBackOfHand: '🤚',
  wavingHand: '👋',
  handWithFingersSpread: '🖐️',
  raisedHand: '✋',
  vulcanSalute: '🖖',
  loveYouGesture: '🤟',
  signOfTheHorns: '🤘',
  victoryHand: '✌️',
  crossedFingers: '🤞',
  handWithIndexFingerAndThumbCrossed: '🫰',
  callMeHand: '🤙',
  pinchingHand: '🤌',
  pinchedFingers: '🤏',
  okHand: '👌',
  middleFinger: '🖕',
  indexPointingUp: '☝️',
  indexPointingUpAlt: '👆',
  indexPointingDown: '👇',
  indexPointingRight: '👉',
  indexPointingLeft: '👈',
  youGesture: '🫵',
  writingHand: '✍️',
  selfie: '🤳',
  prayingHands: '🙏',
  nailPolish: '💅',

  // Symbols
  checkMark: '✔️',
  checkMarkButton: '✅',
  ballotBoxWithCheck: '☑️',
  crossMark: '✖️',
  crossMarkButton: '❌',
  crossMarkButtonAlt: '❎',
  plus: '➕',
  minus: '➖',
  division: '➗',
  curlyLoop: '➰',
  doubleCurlyLoop: '➿',
  arrowRight: '➤',
  leftArrow: '⬅️',
  upArrow: '⬆️',
  downArrow: '⬇️',
  rightArrow: '➡️',
  leftRightArrow: '↔️',
  upDownArrow: '↕️',
  clockwiseVerticalArrows: '🔃',
  anticlockwiseArrowsButton: '🔄',
  backArrow: '🔙',
  onButton: '🔛',
  soonArrow: '🔜',
  endArrow: '🔚',
  fastForward: '⏩',
  fastReverse: '⏪',
  fastUpButton: '⏫',
  fastDownButton: '⏬',
  upButton: '🔼',
  downButton: '🔽',
  redHeart: '❤️',
  orangeHeart: '🧡',
  yellowHeart: '💛',
  greenHeart: '💚',
  blueHeart: '💙',
  purpleHeart: '💜',
  brownHeart: '🤎',
  blackHeart: '🖤',
  whiteHeart: '🤍',
  brokenHeart: '💔',
  heavyHeartExclamation: '❣️',
  twoHearts: '💕',
  revolvingHearts: '💞',
  beatingHeart: '💓',
  growingHeart: '💗',
  sparklingHeart: '💖',
  heartWithArrow: '💘',
  heartWithRibbon: '💝',
  heartDecoration: '💟',
  musicalNotes: '🎶',
  musicalNote: '🎵',
  musicalScore: '🎼',
};


  constructor(private elementRef: ElementRef, private renderer: Renderer2) {
    this.clickListener = this.renderer.listen(
      'document',
      'click',
      (event: MouseEvent) => this.handleDocumentClick(event)
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['messages']) {
      this.transformReactionsToEmoji();
      console.log('Updated messages with emojis:', this.messages);
    }
  }

private transformReactionsToEmoji(): void {
  this.messages.forEach((message) => {
    if (Array.isArray(message.reactions)) {
      message.reactions = this.groupAndCountReactions(message.reactions);
    }
  });
}


  private groupAndCountReactions(reactions: any[]): { reaction: string; count: number }[] {
  const groupedReactions: { [key: string]: { reaction: string; count: number } } = {};

  reactions.forEach((reaction: any) => {
    const emoji = this.reactionEmojiMap[reaction.type] || reaction.type || reaction.reaction;
    if (groupedReactions[emoji]) {
      groupedReactions[emoji].count += reaction.count || 1;
    } else {
      groupedReactions[emoji] = { reaction: emoji, count: reaction.count || 1 };
    }
  });

  return Object.values(groupedReactions);
}


  toggleReactions(message: any): void {
    this.reactionsExpanded[message.id] = !this.reactionsExpanded[message.id];
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
    this.closeAllReactionPickers();
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
