import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CadastrarUsuario, LoginCredenciais } from 'src/DTO/auth';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import 'multer';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly jwt: JwtService,
  ) {}

  async cadastrarUsuario(data: CadastrarUsuario, foto?: Express.Multer.File) {
    const verificaEmail = await this.prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (verificaEmail) {
      throw new ConflictException('O email ja esta cadastrado');
    }

    const verificaNome = await this.prisma.user.findUnique({
      where: {
        name: data.nome,
      },
    });

    if (verificaNome) {
      throw new ConflictException('O nome de usuário ja esta cadastrado');
    }

    let photoUrl: string | undefined;
    if (foto) {
      const upload = await this.cloudinary.uploadImage(foto, 'meteflix/users');
      photoUrl = upload.secure_url;
    }

    const senhaCriptografada = await bcrypt.hash(data.senha, 12);
    const dataHoraCriacao = new Date().toISOString();

    try {
      await this.prisma.user.create({
        data: {
          name: data.nome,
          email: data.email,
          passwordHash: senhaCriptografada,
          photoUrl,
          createdAt: dataHoraCriacao,
          updatedAt: dataHoraCriacao,
        },
      });

      return { code: 201, message: 'Usuário cadastrado com sucesso' };
    } catch (error) {
      console.log(error);
      throw new ConflictException('Erro ao cadastrar usuário');
    }
  }

  async loginCredenciais(data: LoginCredenciais) {
    const usuario = await this.prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const verificaSenha = await bcrypt.compare(data.senha, usuario.passwordHash);

    if (!verificaSenha) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const token = await this.jwt.signAsync({
      sub: usuario.id,
      email: usuario.email,
      name: usuario.name,
    });

    const { passwordHash: _, ...usuarioSemSenha } = usuario;

    return {
      access_token: token,
      usuario: {
        ...usuarioSemSenha,
        couple: await this.coupleDoUsuario(usuario.id),
      },
    };
  }

  async perfilUsuario(usuarioId: string) {
    const usuario = await this.prisma.user.findUnique({
      where: {
        id: usuarioId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    return {
      ...usuario,
      couple: await this.coupleDoUsuario(usuarioId),
    };
  }

  private async coupleDoUsuario(usuarioId: string) {
    const couple = await this.prisma.couple.findFirst({
      where: {
        OR: [{ user1Id: usuarioId }, { user2Id: usuarioId }],
      },
      select: {
        id: true,
        status: true,
        user1: { select: { id: true, name: true } },
        user2: { select: { id: true, name: true } },
      },
    });

    if (!couple) {
      return null;
    }

    const parceiro =
      couple.user1.id === usuarioId ? couple.user2 : couple.user1;

    return {
      id: couple.id,
      status: couple.status,
      partnerName: parceiro?.name ?? null,
    };
  }
}
