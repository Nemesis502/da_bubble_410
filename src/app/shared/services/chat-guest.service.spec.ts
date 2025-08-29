import { TestBed } from '@angular/core/testing';

import { ChatGuestService } from './chat-guest.service';

describe('ChatGuestService', () => {
  let service: ChatGuestService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatGuestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
