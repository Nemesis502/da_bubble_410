import { TestBed } from '@angular/core/testing';

import { NewMessageSendingService } from './new-message-sending.service';

describe('NewMessageSendingService', () => {
  let service: NewMessageSendingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NewMessageSendingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
