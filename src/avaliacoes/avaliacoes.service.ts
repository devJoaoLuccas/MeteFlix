import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DashboardCasal } from 'src/DTO/Avaliacoes';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AvaliacoesService {
    constructor(private readonly prisma: PrismaService) { }

    async getDashboardCasal(data: DashboardCasal) {
        if (!data.casalId || !data.usuarioId) {
            throw new BadRequestException('Os dados nescessarios nao foram informados');
        }

        await this.validarCasal(data.casalId, data.usuarioId);

        const [historico, media] = await Promise.all([
            this.prisma.watchHistory.findMany({
                where: {
                    coupleId: data.casalId,
                    ratings: {
                        some: {},
                    },
                },
                orderBy: {
                    watchedAt: 'desc',
                },
                select: {
                    watchedAt: true,
                    movie: {
                        select: {
                            tmdbId: true,
                            title: true,
                            posterPath: true,
                        },
                    },
                    ratings: {
                        select: {
                            nota: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
            }),
            this.prisma.rating.aggregate({
                where: {
                    watchHistory: {
                        coupleId: data.casalId,
                    },
                },
                _avg: {
                    nota: true,
                },
            }),
        ]);

        const movies = historico.map((sessao) => ({
            tmdbId: sessao.movie.tmdbId,
            title: sessao.movie.title,
            posterPath: sessao.movie.posterPath,
            watchedAt: sessao.watchedAt,
            userEvaluations: sessao.ratings.map((avaliacao) => ({
                userId: avaliacao.user.id,
                userName: avaliacao.user.name,
                rating: avaliacao.nota,
            })),
        }));

        const mediaGeral = media._avg.nota ?? 0;

        return {
            totalEvaluated: movies.length,
            coupleAverage: Math.round(mediaGeral * 10) / 10,
            movies,
        };

    }

    private async validarCasal(casalId: string, usuarioId: string) {
        const casal = await this.prisma.couple.findUnique({
            where: {
                id: casalId,
            },
        });

        if (!casal) {
            throw new NotFoundException('O casal nao foi encontrado');
        } else if (casal.user1Id !== usuarioId && casal.user2Id !== usuarioId) {
            throw new ForbiddenException('O usuario nao faz parte do casal');
        } else if (casal.status === 'PENDING') {
            throw new ForbiddenException('O casal nao esta ativo');
        }

        return casal;
    }

}
