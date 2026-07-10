import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DashboardCasal, DetalheAvaliacao } from 'src/DTO/Avaliacoes';
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

    async getDetalheAvaliacao(data: DetalheAvaliacao) {
        if (!data.casalId || !data.usuarioId || !data.tmdbId) {
            throw new BadRequestException('Os dados nescessarios nao foram informados');
        }

        await this.validarCasal(data.casalId, data.usuarioId);

        // filtrar pelo coupleId garante que a sessao pertence ao casal do usuario
        const sessao = await this.prisma.watchHistory.findFirst({
            where: {
                coupleId: data.casalId,
                movie: {
                    tmdbId: data.tmdbId,
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
                        overview: true,
                        releaseYear: true,
                    },
                },
                ratings: {
                    select: {
                        nota: true,
                        opiniao: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                photoUrl: true,
                            },
                        },
                    },
                },
            },
        });

        if (!sessao) {
            throw new NotFoundException('O casal ainda nao assistiu esse filme');
        }

        const evaluations = sessao.ratings.map((avaliacao) => ({
            userId: avaliacao.user.id,
            userName: avaliacao.user.name,
            userPhotoUrl: avaliacao.user.photoUrl,
            rating: avaliacao.nota,
            comment: avaliacao.opiniao,
        }));

        const coupleRating = evaluations.length === 0
            ? 0
            : evaluations.reduce((soma, avaliacao) => soma + avaliacao.rating, 0) / evaluations.length;

        return {
            movieId: sessao.movie.tmdbId,
            title: sessao.movie.title,
            posterPath: sessao.movie.posterPath,
            overview: sessao.movie.overview,
            releaseYear: sessao.movie.releaseYear,
            watchedAt: sessao.watchedAt,
            coupleRating: Math.round(coupleRating * 100) / 100,
            evaluations,
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
