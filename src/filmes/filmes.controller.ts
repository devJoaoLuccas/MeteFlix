import { Body, Controller, Get, Param, Post, Query, Request, UseGuards, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { AuthGuard, TokenPayload } from 'src/auth/auth.guard';
import { FilmesService } from './filmes.service';

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

    @Post('wishlist/:casalId')
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
}
