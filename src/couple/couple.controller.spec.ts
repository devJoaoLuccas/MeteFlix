import { Test, TestingModule } from '@nestjs/testing';
import { CoupleController } from './couple.controller';

describe('CoupleController', () => {
  let controller: CoupleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoupleController],
    }).compile();

    controller = module.get<CoupleController>(CoupleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
