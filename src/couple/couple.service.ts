import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CoupleService {
    constructor( private readonly prisma: PrismaService ) {}

    async coupleDoUsuario(usuarioId: string) {
        const couple = await this.prisma.couple.findFirst({
            where: {
                OR: [
                    { user1Id: usuarioId },
                    { user2Id: usuarioId},
                ],
            },
            select: {
                id: true,
                status: true,
                user1: { select: { id: true, name: true, photoUrl: true}},
                user2: { select: { id: true, name: true, photoUrl: true}}, 
            }
        })

        if(!couple) {
            throw new NotFoundException('O usuario nao possui um casal');
        }

        return couple;
    }

    async criarCouple(usuarioId: string) {
        const coupleExistente = await this.prisma.couple.findFirst({
            where: {
                OR: [
                    { user1Id: usuarioId },
                    { user2Id: usuarioId},
                ],
            }
        })

        if(coupleExistente) {
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

}
