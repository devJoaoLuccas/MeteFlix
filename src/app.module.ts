import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CoupleModule } from './couple/couple.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { FilmesModule } from './filmes/filmes.module';
import { AvaliacoesModule } from './avaliacoes/avaliacoes.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CoupleModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
    CacheModule.register({
      isGlobal: true,
    }),
    FilmesModule,
    AvaliacoesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
