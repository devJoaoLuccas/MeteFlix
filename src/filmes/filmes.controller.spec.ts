import { Test, TestingModule } from '@nestjs/testing';
import { FilmesController } from './filmes.controller';

describe('FilmesController', () => {
  let controller: FilmesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilmesController],
    }).compile();

    controller = module.get<FilmesController>(FilmesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
