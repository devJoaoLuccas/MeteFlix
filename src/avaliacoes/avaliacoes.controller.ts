import { Controller, Get, Param, Request, UseGuards, UseInterceptors } from '@nestjs/common';
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
}
