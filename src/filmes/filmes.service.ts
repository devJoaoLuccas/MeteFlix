import { BadGatewayException, BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Prisma } from 'generated/prisma/client';
import { AdicionarFilme, ListarWishlist, RemoverFilme } from 'src/DTO/Filmes';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FilmesService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(CACHE_MANAGER) private readonly cache: Cache,
    ) { }

    private async atualizarCacheDaWishlist(casalId: string) {
        const chaves = [
            `/filmes/wishlist/${casalId}`,
            `/filmes/wishlist/${casalId}?assistidos=true`,
            `/filmes/wishlist/${casalId}?assistidos=false`,
        ];

        await Promise.all(chaves.map((chave) => this.cache.del(chave)));
    }

    async listarWishlist(data: ListarWishlist) {

        await this.validarCasal(data.casalId, data.usuarioId);

        const watchlist = await this.prisma.wishlistItem.findMany({
            where: {
                coupleId: data.casalId,
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
                    coupleId: data.casalId,
                    watched: true,
                },
            }),
            this.prisma.wishlistItem.count({
                where: {
                    coupleId: data.casalId,
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

        await this.validarCasal(data.casalId, data.usuarioId);

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

        await this.atualizarCacheDaWishlist(data.casalId);

        return {code: 201, message: 'O filme foi adicionado com sucesso!'}

    }

    async removerFilme (data: RemoverFilme) {
        if (!data.casalId || !data.tmdbId || !data.usuarioId) {
            throw new BadRequestException('Os dados nescessarios nao foram informadoss');
        }

        await this.validarCasal(data.casalId, data.usuarioId);

        const validaWishlist = await this.prisma.wishlistItem.findFirst({
            where: {
                coupleId: data.casalId,
                movie: {
                    tmdbId: data.tmdbId,
                },
            },
            select: {
                id: true,
                watched: true,
                addedBy: {
                    select: {
                        id: true,
                    },
                },
            },
        })

        if (!validaWishlist) {
            throw new NotFoundException('Nao foi possivel encontrar o filme');
        } else if (validaWishlist.watched) {
            throw new ForbiddenException('O casal ja assistiu o filme, nao podemos remover');
        } else if (validaWishlist.addedBy.id !== data.usuarioId) {
            throw new ForbiddenException('O usuario nao pode remover o filme, adicionado pelo outro');
        }

        await this.prisma.wishlistItem.delete({
            where: {
                id: validaWishlist.id,
                coupleId: data.casalId,
            }
        })

        await this.atualizarCacheDaWishlist(data.casalId);

        return {code: 200, message: 'O filme foi removido com sucesso!'}

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
