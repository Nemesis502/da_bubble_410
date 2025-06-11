import { Injectable } from '@angular/core';
import { ChannelsDirectMessageService, DirectMessage } from './channels-direct-message.service';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  constructor(private data: ChannelsDirectMessageService) { }

  filterChannels(searchTerm: string): string[] {
    const query = searchTerm.toLowerCase();
    return this.data.getChannels().filter(c =>
      c.toLowerCase().includes(query)
    );
  }

  filterDirectMessages(searchTerm: string): DirectMessage[] {
    const query = searchTerm.toLowerCase();
    return this.data.getDirectMessages().filter(dm =>
      dm.name.toLowerCase().includes(query)
    );
  }
}