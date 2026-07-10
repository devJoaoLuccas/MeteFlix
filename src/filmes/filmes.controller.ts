import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards, UseInterceptors } from '@nestjs/common';
import { CacheTTL } from '@nestjs/cache-manager';
import { AuthGuard, TokenPayload } from 'src/auth/auth.guard';
import { UserCacheInterceptor } from 'src/common/user-cache.interceptor';
import { FilmesService } from './filmes.service';
import { Throttle } from '@nestjs/throttler';

@Controller('filmes')
export class FilmesController {
    constructor(private readonly filmesService: FilmesService) { }

    @Get('wishlist/:casalId')
    @UseInterceptors(UserCacheInterceptor)
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

    @Patch('wishlist/:id/mark-watched')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @UseGuards(AuthGuard)
    marcarComoAssistido(
        @Param('id') id: string,
        @Request() req: { usuario: TokenPayload },
    ) {
        return this.filmesService.marcarComoAssistido({
            wishlistItemId: id,
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
