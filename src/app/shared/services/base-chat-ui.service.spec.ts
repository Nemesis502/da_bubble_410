import { TestBed } from '@angular/core/testing';

import { BaseChatUIService } from './base-chat-ui.service';

describe('BaseChatUiService', () => {
  let service: BaseChatUIService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BaseChatUIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
