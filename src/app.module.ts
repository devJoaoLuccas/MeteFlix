import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CoupleModule } from './couple/couple.module';

@Module({
  imports: [PrismaModule, AuthModule, CoupleModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
