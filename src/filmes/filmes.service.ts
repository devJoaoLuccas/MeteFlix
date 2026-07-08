import { BadGatewayException, BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { AdicionarFilme, ListarWishlist } from 'src/DTO/Filmes';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FilmesService {
    constructor(private readonly prisma: PrismaService) { }

    async listarWishlist(data: ListarWishlist) {

        const casal = await this.prisma.couple.findUnique({
            where: {
                id: data.casalId,
                OR: [
                    { user1Id: data.usuarioId},
                    { user2Id: data.usuarioId},
                ],
            },
        })

        if (!casal) {
            throw new NotFoundException('Nao foi possivel encontrar o casal');
        } else if (casal.status === 'PENDING') {
            throw new ForbiddenException('O casal nao esta ativo');
        }

        const watchlist = await this.prisma.wishlistItem.findMany({
            where: {
                coupleId: casal.id,
                watched: data.status,
            }, 
            select: {
                addedBy: {
                    select: {
                        name: true,
                        photoUrl: true,
                    }
                },
            createdAt: true,
            movie: {
                select: {
                    tmdbId: true,
                    title: true,
                    posterPath: true,
                    releaseYear: true,
                },
            },
            },
        });

        if (watchlist.length === 0) {
            throw new NotFoundException('Nao foi encontrado nenhum filme na Wishlist');
        }

        const [assistidos, semAssistir] = await Promise.all([
            this.prisma.wishlistItem.count({
                where: {
                    coupleId: casal.id,
                    watched: true,
                },
            }),
            this.prisma.wishlistItem.count({
                where: {
                    coupleId: casal.id,
                    watched: false,
                },
            }),
        ])

        const total = assistidos + semAssistir;

        return {code: 200, watchlist, total: total, qntAssistidos: assistidos, qntSemAssistir: semAssistir }

    }

    async adicionarFilme (data: AdicionarFilme) {
        if (!data.casalId || !data.tmdbId || !data.usuarioId) {
            throw new BadRequestException('Os dados nescessarios nao foram informados');
        }

        const buscaCouple = await this.prisma.couple.findUnique({
            where: {
                id: data.casalId,
            },
        });

        if (!buscaCouple) {
            throw new NotFoundException('O casal nao foi encontrado');
        } else if (buscaCouple.status === 'PENDING') {
            throw new ForbiddenException('O casal esta como pendente');
        } else if (buscaCouple.user1Id !== data.usuarioId && buscaCouple.user2Id !== data.usuarioId) {
            throw new UnauthorizedException('O usuario nao faz parte do casal');
        }

        const filmeLocal = await this.prisma.movie.findUnique({
            where: {
                tmdbId: data.tmdbId,
            },
        });

        const filme = filmeLocal ?? await this.buscarFilmeTmdb(data.tmdbId);

        try {
            await this.prisma.wishlistItem.create({
                data: {
                    couple: {
                        connect: { id: data.casalId },
                    },
                    addedBy: {
                        connect: { id: data.usuarioId },
                    },
                    movie: {
                        connectOrCreate: {
                            where: { tmdbId: data.tmdbId },
                            create: {
                                tmdbId: data.tmdbId,
                                title: filme.title,
                                posterPath: filme.posterPath,
                                overview: filme.overview,
                                releaseYear: filme.releaseYear,
                            },
                        },
                    },
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException('Filme ja esta na wishlist');
            }
            throw error;
        }

        return {code: 201, message: 'O filme foi adicionado com sucesso!'}

    }

    private async buscarFilmeTmdb(tmdbId: number) {
        const resposta = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=pt-BR`, {
            headers: {
                accept: 'application/json',
                Authorization: `Bearer ${process.env.TMDB_API_TOKEN}`,
            },
        });

        if (resposta.status === 404) {
            throw new NotFoundException('O filme nao foi encontrado no TMDB');
        } else if (!resposta.ok) {
            throw new BadGatewayException('Nao foi possivel consultar o TMDB');
        }

        const filme = await resposta.json() as {
            title: string,
            poster_path: string | null,
            overview: string | null,
            release_date: string | null,
        };

        return {
            title: filme.title,
            posterPath: filme.poster_path,
            overview: filme.overview,
            releaseYear: filme.release_date ? Number(filme.release_date.slice(0, 4)) : null,
        };
    }



}
