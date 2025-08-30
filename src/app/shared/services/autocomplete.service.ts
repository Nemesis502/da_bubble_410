import { Injectable } from '@angular/core';
import { MentionChannel, MentionService, MentionUser } from './mentions.service';

@Injectable({ providedIn: 'root' })
export class AutocompleteService {
  constructor(private mentionService: MentionService) {}

  // Filters a list of mentionable users based on the last @keyword typed
  filterMentions(text: string, users: MentionUser[]): MentionUser[] {
    const keyword = this.mentionService.extractLastMentionKeyword(text);
    return this.mentionService.filterUsers(users, keyword);
  }

  // Filters a list of channels based on the last #keyword typed
  filterHashtags(text: string, channels: MentionChannel[]): MentionChannel[] {
    const keyword = this.mentionService.extractLastHashtagKeyword(text);
    return this.mentionService.filterChannels(channels, keyword);
  }

  // Inserts a mention (@user) or hashtag (#channel) at the cursor position
  // Returns the updated text and the new cursor position
  insertAtCursor(
    triggerChar: '@' | '#',
    value: string,
    text: string,
    cursorPos: number
  ): { newText: string; newCursorPos: number } {
    const triggerIndex = text.lastIndexOf(triggerChar, cursorPos);
    if (triggerIndex === -1) return { newText: text, newCursorPos: cursorPos };

    const before = text.slice(0, triggerIndex);
    const after = text.slice(cursorPos);
    const newText = `${before}${triggerChar}${value} ${after}`;
    const newCursorPos = triggerIndex + value.length + 2;

    return { newText, newCursorPos };
  }
}
