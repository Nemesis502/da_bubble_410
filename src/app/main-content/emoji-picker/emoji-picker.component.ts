import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-emoji-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './emoji-picker.component.html',
  styleUrl: './emoji-picker.component.scss'
})
export class EmojiPickerComponent {
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
    '😎', '🤓', '🧐', '😕', '👃', '👂', '🦻', '🦶', '🦵', '🦿', '🦾', '💪',
    '👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🤜', '🤛', '✊', '👊',
    '🤚', '👋', '🖐️', '✋', '🖖', '🤟', '🤘', '✌️', '🤞',
    '🤙', '🤏', '👌', '🖕', '☝️', '👆', '👇', '👉', '👈', '✍️', '🤳',
    '🙏', '💅', //'🫰', '🤌', '🫴', '🫱', '🫲', '🫳', 'Test', '🫵', '🫶',
    // Symbols
    '✔️', '✅', '☑️', '✖️', '❌', '❎', '➕', '➖', '➗', '➰', '➿', '➤', '⬅️',
    '⬆️', '⬇️', '➡️', '↔️', '↕️', '🔃', '🔄', '🔙', '🔛', '🔜', '🔚', '⏩', '⏪',
    '⏫', '⏬', '🔼', '🔽', '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍',
    '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '🎶', '🎵', '🎼',
  ];

  selectEmoji(emoji: string) {
    this.emojiSelected.emit(emoji);
    this.pickerClosed.emit();
  }

}