import { TestBed } from '@angular/core/testing';

import { ChatLoadingService } from './chat-loading.service';

describe('ChatLoadingService', () => {
  let service: ChatLoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatLoadingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
