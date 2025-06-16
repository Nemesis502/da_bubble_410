import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-reaction-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reaction-picker.component.html',
  styleUrl: './reaction-picker.component.scss'
})
export class ReactionPickerComponent {
  @Input() pickerPosition: { top: number; left: number } = { top: 0, left: 0 };
  @Output() emojiSelected = new EventEmitter<string>();
  @Output() pickerClosed = new EventEmitter<void>();

  emojis: string[] = [
  // Smileys & Emotion
  '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍',
  '😘', '😗', '😙', '😚', '🙂', '🤗', '🤔', '😐', '😑', '😶', '🙄', '😏', '😣',
  '😥', '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜', '😝', '🤤', '😒',
  '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁', '😖', '😞', '😟', '😤', '😢',
  '😭', '😦', '😧', '😨', '😩', '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪',
  '😵', '😡', '😠', '🤬', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '😇', '🤠', '🥳',
  '🥸', '😎', '🤓', '🧐', '😕', '👃' ,'👂' ,'🦻' ,'🦶' ,'🦵' ,'🦿' ,'🦾' ,'💪',
  '👍', '👎', '👏', '🫶', '🙌', '👐', '🤲', '🤝', '🤜', '🤛', '✊', '👊', '🫳',
  '🫴', '🫱', '🫲', '🤚', '👋', '🖐️', '✋', '🖖', '🤟', '🤘', '✌️', '🤞', '🫰',
  '🤙', '🤌', '🤏', '👌', '🖕', '☝️', '👆', '👇', '👉', '👈', '🫵', '✍️', '🤳', 
  
  '🙏', '💅',
  // Symbols
  '✔️', '✅', '☑️', '✖️', '❌', '❎', '➕', '➖', '➗', '➰', '➿', '➤', '⬅️',
  '⬆️', '⬇️', '➡️', '↔️', '↕️', '🔃', '🔄', '🔙', '🔛', '🔜', '🔚', '⏩', '⏪',
  '⏫', '⏬', '🔼', '🔽', '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍',
  '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '🎶', '🎵', '🎼',
];


  selectReaction(emoji: string) {
    this.emojiSelected.emit(emoji); 
  }

}
