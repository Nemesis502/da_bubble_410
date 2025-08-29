import { TestBed } from '@angular/core/testing';

import { ChatSubscriptionService } from './chat-subscription.service';

describe('ChatSubscriptionService', () => {
  let service: ChatSubscriptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatSubscriptionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
