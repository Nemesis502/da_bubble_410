import { TestBed } from '@angular/core/testing';

import { MessageParseService } from './message-parse.service';

describe('MessageParseService', () => {
  let service: MessageParseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessageParseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
