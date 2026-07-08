import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { randomBytes } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { AceitarConvite, Casal } from '../DTO/Couple';
import { CoupleStatus } from 'generated/prisma/enums';

@Injectable()
export class CoupleService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(CACHE_MANAGER) private readonly cache: Cache,
    ) { }

    private async atualizarCacheDoCasal(casal: Casal) {
        const chaves = [
            `/couples/me:user:${casal.user1Id}`,
            `/filmes/wishlist/${casal.id}`,
            `/filmes/wishlist/${casal.id}?assistidos=true`,
            `/filmes/wishlist/${casal.id}?assistidos=false`,
        ];

        if (casal.user2Id) {
            chaves.push(`/couples/me:user:${casal.user2Id}`);
        }

        await Promise.all(chaves.map((chave) => this.cache.del(chave)));
    }

    async coupleDoUsuario(usuarioId: string) {
        const couple = await this.prisma.couple.findFirst({
            where: {
                OR: [
                    { user1Id: usuarioId },
                    { user2Id: usuarioId },
                ],
            },
            select: {
                id: true,
                status: true,
                user1: { select: { id: true, name: true, photoUrl: true } },
                user2: { select: { id: true, name: true, photoUrl: true } },
            }
        })

        if (!couple) {
            throw new NotFoundException('O usuario nao possui um casal');
        }

        return couple;
    }

    async criarCouple(usuarioId: string) {
        const coupleExistente = await this.prisma.couple.findFirst({
            where: {
                OR: [
                    { user1Id: usuarioId },
                    { user2Id: usuarioId },
                ],
            }
        })

        if (coupleExistente) {
            throw new ConflictException('O usuario ja possui um casal');
        }

        const inviteCode = randomBytes(4).toString('hex').toUpperCase();

        return await this.prisma.couple.create({
            data: {
                inviteCode,
                user1Id: usuarioId,
            },
            select: {
                id: true,
                inviteCode: true,
                status: true,
            }
        })
    }

    async joinCouple(data: AceitarConvite) {

        if (!data.inviteCode) {
            throw new NotFoundException('O usuário não informou um invite code');
        }

        const [usuario, casal] = await Promise.all([
            this.prisma.user.findUnique({
                where: {
                    id: data.usuarioId,
                },
                select: {
                    id: true,
                    coupleAsUser1: true,
                    coupleAsUser2: true,
                }
            })

            , this.prisma.couple.findUnique({
                where: {
                    inviteCode: data.inviteCode,
                    status: 'PENDING'
                },
            })
        ]);

        if (!usuario) {
            throw new NotFoundException('O usuário não foi encontrado');
        } else if (usuario.coupleAsUser1 && usuario.coupleAsUser2) {
            throw new ForbiddenException('O usuário já está em um casal');
        }

        if (!casal) {
            throw new NotFoundException('O casal não foi encontrado');
        } else if (casal.status === 'ACTIVE') {
            throw new UnauthorizedException('O casal já está ativo');
        } else if (casal.user1Id === usuario.id) {
            throw new UnauthorizedException('Você não pode aceitar seu próprio convite');
        }

        await this.prisma.couple.update({
            where: {
                inviteCode: data.inviteCode,
                status: 'PENDING'
            },
            data: {
                user2Id: data.usuarioId,
                status: CoupleStatus.ACTIVE,
            }
        })

        return {
            code: 200,
            message: 'Convite aceito com sucesso'
        }
    }

    async sairDoCasal(casalId: string, usuarioId: string) {
        const casal = await this.prisma.couple.findUnique({
            where: {
                id: casalId,
                OR: [
                    { user1Id: usuarioId },
                    { user2Id: usuarioId },
                ],
            },
        });

        if (!casal) {
            throw new NotFoundException('O casal nao foi encontrado');
        }

        if (casal.status === 'PENDING') {
            throw new ForbiddenException('Nao e possivel sair de um casal com convite pendente');
        }

        await this.prisma.couple.delete({
            where: {
                id: casal.id,
            },
        });

        await this.atualizarCacheDoCasal(casal);

        return { code: 200, message: 'Usuario saiu com sucesso do casal' };
    }

}
