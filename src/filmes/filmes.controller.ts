import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Request, UseGuards, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { AuthGuard, TokenPayload } from 'src/auth/auth.guard';
import { FilmesService } from './filmes.service';
import { Throttle } from '@nestjs/throttler';

@Controller('filmes')
export class FilmesController {
    constructor(private readonly filmesService: FilmesService) { }

    @Get('wishlist/:casalId')
    @UseInterceptors(CacheInterceptor)
    @CacheTTL(30000)
    @UseGuards(AuthGuard)
    listarWishlist(
        @Param('casalId') casalId: string,
        @Query('assistidos') assistidos: string,
        @Request() req: { usuario: TokenPayload },
    ) {
        return this.filmesService.listarWishlist({
            casalId,
            usuarioId: req.usuario.sub,
            status: assistidos === 'true',
        });
    }

    @Get('wishlist/:casalId/aleatorio')
    @UseGuards(AuthGuard)
    getFilmeAleatorio(
        @Param('casalId') casalId: string,
        @Request() req: { usuario: TokenPayload },
    ) {
        return this.filmesService.getFilmeAleatorio({
            casalId,
            usuarioId: req.usuario.sub,
        });
    }

    @Post('wishlist/:casalId')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @UseGuards(AuthGuard)
    adicionarFilme(
        @Param('casalId') casalId: string,
        @Body('tmdbId') tmdbId: number,
        @Request() req: { usuario: TokenPayload },
    ) {
        return this.filmesService.adicionarFilme({
            casalId,
            tmdbId,
            usuarioId: req.usuario.sub,
        });
    }

    @Delete('wishlist/:casalId/:tmdbId')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @UseGuards(AuthGuard)
    removerFilme(
        @Param('casalId') casalId: string,
        @Param('tmdbId', ParseIntPipe) tmdbId: number,
        @Request() req: { usuario: TokenPayload },
    ) {
        return this.filmesService.removerFilme({
            casalId,
            tmdbId,
            usuarioId: req.usuario.sub,
        });
    }
}
