import { Injectable } from "@angular/core";

export interface DirectMessage {
  name: string;
  img: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChannelsDirectMessageService {
  private channels: string[] = [
    'Entwicklerteam',
    'Office-Team'
  ];

  private directMessages: DirectMessage[] = [{
    name: 'Frederik Beck (Du)',
    img: '3.png'
  }, {
    name: 'Sofia Müller',
    img: '5.png'
  }, {
    name: 'Noah Braun',
    img: '6.png'
  }, {
    name: 'Elise Roth',
    img: '1.png'
  }, {
    name: 'Elias Neumann',
    img: '2.png'
  }, {
    name: 'Steffen Hoffmann',
    img: '4.png'
  }];

  getChannels(): string[] {
    return this.channels;
  }

  getDirectMessages(): DirectMessage[] {
    return this.directMessages;
  }
}
