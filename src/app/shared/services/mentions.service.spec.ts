import { TestBed } from '@angular/core/testing';

import { MentionsService } from './mentions.service';

describe('MentionsService', () => {
  let service: MentionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MentionsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
