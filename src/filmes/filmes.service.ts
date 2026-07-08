import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ListarWishlist } from 'src/DTO/Filmes';
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



}
