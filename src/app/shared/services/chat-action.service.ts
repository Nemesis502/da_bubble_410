import { Injectable } from '@angular/core';
import { ChatService } from './chat.service';
import { ChatUIService } from './chat-ui.service';
import { appUser } from '../../interfaces/user.interface';

@Injectable({
  providedIn: 'root',
})
export class ChatActionsService {
  constructor(
    private chatService: ChatService,
    private chatUIService: ChatUIService
  ) {}

  /**
   * Sends a chat message with the correct context.
   * @param chatMessage Current message typed
   * @param selectedChannel Channel object
   * @param currentUser Current logged-in user
   * @param editedMessage Currently edited message, if any
   * @param isThreadView Whether this is a thread view
   */
  async sendMessage(
    chatMessage: string,
    selectedChannel: any,
    currentUser: appUser,
    editedMessage: any,
    isThreadView: boolean
  ): Promise<void> {
    const messageText = chatMessage.trim();
    const channelId = selectedChannel?.channelId;
    const userId = currentUser?.id;

    if (!messageText || !channelId || !userId) return;

    await this.chatService.sendMessage(
      channelId,
      messageText,
      userId,
      this.buildChatContext(editedMessage, isThreadView)
    );

    this.chatUIService.scrollToBottom();
  }

  /**
   * Builds chat context object for sending messages.
   * @param editedMessage Message currently being edited
   * @param isThreadView Whether current view is a thread
   */
  private buildChatContext(editedMessage: any, isThreadView: boolean) {
    return {
      isConversation: this.chatService.isConversation,
      isThread: isThreadView || this.chatService.isThread,
      activeThreadMessageId: this.chatService.activeThreadMessageId,
      editedMessage: editedMessage,
    };
  }

  /**
   * Initializes editing of a message.
   * @param chatMessage Current chat input value
   * @param message Message object to edit
   * @returns The message object set for editing
   */
  startEditingMessage(chatMessage: string, message: any): any {
    chatMessage = message.text;
    this.chatUIService.focusChatInput();
    return message;
  }

  /**
   * Stops editing the current message and clears chat input.
   * @returns null to reset editedMessage
   */
  stopEditing(): null {
    this.chatUIService.focusChatInput();
    return null;
  }

  /**
   * Resets the chat input value and scrolls to bottom.
   * @param chatMessage Reference to chat input string
   * @param editedMessage Reference to edited message
   * @returns Updated chat input and edited message
   */
  resetChatInput(chatMessage: string, editedMessage: any): { chatMessage: string; editedMessage: any } {
    chatMessage = '';
    editedMessage = null;
    this.chatUIService.scrollToBottom();
    return { chatMessage, editedMessage };
  }
}
