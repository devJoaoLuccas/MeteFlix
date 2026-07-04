import { Test, TestingModule } from '@nestjs/testing';
import { CoupleService } from './couple.service';

describe('CoupleService', () => {
  let service: CoupleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoupleService],
    }).compile();

    service = module.get<CoupleService>(CoupleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
