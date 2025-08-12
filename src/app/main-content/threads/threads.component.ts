import { Component } from '@angular/core';
import { MessageTemplateComponent } from '../message-template/message-template.component';
import { appUser } from '../../interfaces/user.interface';
import { elementAt, Observable, of } from 'rxjs';
import { ChannelsDirectMessageService } from '../../shared/services/channels-direct-message.service';
import { Message } from '../../interfaces/message.interface';
import { Thread } from '../../interfaces/thread.interface';
import { collectionData } from '@angular/fire/firestore';
import { onSnapshot } from 'firebase/firestore';
import { trigger } from '@angular/animations';

@Component({
  selector: 'app-threads',
  standalone: true,
  imports: [MessageTemplateComponent],
  templateUrl: './threads.component.html',
  styleUrl: './threads.component.scss'
})
export class ThreadsComponent {
  currentUser: appUser | null = null;
  otherUser: appUser | null = null;
  selectedChannel: any = null;
  chatMessage: string = '';
  editedMessage: any = null;
  threadMessages: any[] = [];
  chatIsThread: boolean = true;
  chatIsChannel: boolean = false;
  activeThreadMessage: any | null = null;
  messages: any[] = [];
  threadChannel!: Message;


  constructor(private threadService: ChannelsDirectMessageService) {
    // let collection = this.threadService.getChannelThreadMessagesCollection("5nBB7LF8bkTgMKWRzEHh", "niyyI6mpQtePRJxU5tXW")
    onSnapshot(this.threadService.getChannelThreadMessagesCollection("5nBB7LF8bkTgMKWRzEHh", "niyyI6mpQtePRJxU5tXW"), (list) => {
      list.forEach(element => {
        console.log(element.data());
        this.threadChannel = element.data()
      })
    })
    console.log(this.threadChannel);

    // let testCollection = collectionData(collection)
    // console.log(collection);


    // let threadChanne = this.setUserObject(collection)
    // console.log(threadChanne);

  }

  startEditingMessage() { }

  handleReplyToMessage() { }

  setUserObject(obj: any): Thread {
    return {
      text: obj.string,
      threadMessageID: obj.string,
      threadSenderID: obj.string,
      timestamp: obj.Date,
      reactions: obj.Reactions,
      // status: obj.status || false,
      // email: obj.email || "",
    }
  }
}
