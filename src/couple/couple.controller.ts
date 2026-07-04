import { Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard, TokenPayload } from 'src/auth/auth.guard';
import { CoupleService } from './couple.service';

@Controller('couples')
export class CoupleController {
  constructor(private readonly coupleService: CoupleService) {}

  @Post()
  @UseGuards(AuthGuard)
  criar(@Request() req: { usuario: TokenPayload }) {
    return this.coupleService.criarCouple(req.usuario.sub);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Request() req: { usuario: TokenPayload }) {
    return this.coupleService.coupleDoUsuario(req.usuario.sub);
  }
}