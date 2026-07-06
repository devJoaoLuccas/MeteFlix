import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UnauthorizedException, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard, TokenPayload } from 'src/auth/auth.guard';
import { CoupleService } from './couple.service';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { Throttle } from '@nestjs/throttler';

@Controller('couples')
export class CoupleController {
  constructor(private readonly coupleService: CoupleService) { }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(AuthGuard)
  criar(@Request() req: { usuario: TokenPayload }) {
    const usuarioId = req.usuario.sub;

    if (!usuarioId) {
      throw new UnauthorizedException('O usuário não está autenticado');
    }

    return this.coupleService.criarCouple(usuarioId);
  }

  @Get('me')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('couple:me')
  @CacheTTL(30000)
  @UseGuards(AuthGuard)
  me(@Request() req: { usuario: TokenPayload }) {
    return this.coupleService.coupleDoUsuario(req.usuario.sub);
  }

  @Patch('join')
  @Throttle({ default: { limit: 3, ttl: 40000 } })
  @UseGuards(AuthGuard)
  join(@Body('inviteCode') inviteCode: string,
    @Request() req: { usuario: TokenPayload }) {

    const data = {
      inviteCode: inviteCode,
      usuarioId: req.usuario.sub,
    }

    return this.coupleService.joinCouple(data);


  }

  @Delete(':id/leave')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @UseGuards(AuthGuard)
  sair(@Param('id') casalId: string,
    @Request() req: { usuario: TokenPayload }) {

    return this.coupleService.sairDoCasal(casalId, req.usuario.sub);
  }

}