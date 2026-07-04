import { Module } from '@nestjs/common';
import { CoupleController } from './couple.controller';
import { CoupleService } from './couple.service';

@Module({
  controllers: [CoupleController],
  providers: [CoupleService]
})
export class CoupleModule {}
