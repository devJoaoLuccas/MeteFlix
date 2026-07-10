import { Body, Controller, Get, Param, ParseIntPipe, Post, Request, UseGuards, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CacheTTL } from '@nestjs/cache-manager';
import { AuthGuard, TokenPayload } from 'src/auth/auth.guard';
import { UserCacheInterceptor } from 'src/common/user-cache.interceptor';
import { AvaliacoesService } from './avaliacoes.service';

@Controller('avaliacoes')
export class AvaliacoesController {
    constructor(private readonly avaliacoesService: AvaliacoesService) { }

    @Get('casal/:casalId/dashboard')
    @UseInterceptors(UserCacheInterceptor)
    @CacheTTL(60000)
    @UseGuards(AuthGuard)
    getDashboardCasal(
        @Param('casalId') casalId: string,
        @Request() req: { usuario: TokenPayload },
    ) {
        return this.avaliacoesService.getDashboardCasal({
            casalId,
            usuarioId: req.usuario.sub,
        });
    }

    @Get('casal/:casalId/filme/:tmdbId')
    @UseInterceptors(UserCacheInterceptor)
    @CacheTTL(60000)
    @UseGuards(AuthGuard)
    getDetalheAvaliacao(
        @Param('casalId') casalId: string,
        @Param('tmdbId', ParseIntPipe) tmdbId: number,
        @Request() req: { usuario: TokenPayload },
    ) {
        return this.avaliacoesService.getDetalheAvaliacao({
            casalId,
            usuarioId: req.usuario.sub,
            tmdbId,
        });
    }

    @Post('casal/:casalId/filme/:tmdbId')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @UseGuards(AuthGuard)
    criarAvaliacao(
        @Param('casalId') casalId: string,
        @Param('tmdbId', ParseIntPipe) tmdbId: number,
        @Body('rating') rating: number,
        @Body('comment') comment: string | undefined,
        @Request() req: { usuario: TokenPayload },
    ) {
        return this.avaliacoesService.criarAvaliacao({
            casalId,
            usuarioId: req.usuario.sub,
            tmdbId,
            nota: rating,
            opiniao: comment,
        });
    }
}
