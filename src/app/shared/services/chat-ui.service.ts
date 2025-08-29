import { Injectable, ElementRef } from '@angular/core';
import { BaseChatUIService } from './base-chat-ui.service';

@Injectable({ providedIn: 'root' })
export class ChatUIService extends BaseChatUIService {
  // Reference to the main chat container element
  private chatBodyRef!: ElementRef<HTMLElement>;

  /**
   * Sets the reference to the chat container element.
   * Used for scrolling and measuring scrollHeight.
   */
  setChatBodyRef(ref: ElementRef<HTMLElement>) {
    this.chatBodyRef = ref;
  }

  /**
   * Scrolls the chat container to the bottom.
   * Ensures the latest messages are visible and focuses the input.
   */
  scrollToBottom() {
    if (!this.chatBodyRef) return;

    setTimeout(() => {
      const container = this.chatBodyRef.nativeElement;
      container.scrollTop = container.scrollHeight;
    }, 0);

    this.focusChatInput();
  }

  /**
   * Focuses the chat input field.
   * Useful after scrolling or inserting emojis/mentions.
   */
  focusChatInput() {
    if (this.chatFieldRef) this.chatFieldRef.nativeElement.focus();
  }

  /**
   * Opens a dialog to add members to a channel.
   * Positions the dialog for desktop and uses a specific panel class.
   */
  openAddPeopleDialog(channelId: string) {
    this.openMemberDialog(channelId, 'add-members', { top: '190px', right: '45px' });
  }
}
