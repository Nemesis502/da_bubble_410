import { TestBed } from '@angular/core/testing';

import { ChannelsDirectMessageService } from './channels-direct-message.service';

describe('ChannelsDirectMessageService', () => {
  let service: ChannelsDirectMessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChannelsDirectMessageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
