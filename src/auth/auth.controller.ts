import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { AuthGuard, TokenPayload } from './auth.guard';
import type { CadastrarUsuario, LoginCredenciais } from 'src/DTO/auth';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('cadastro')
  @UseInterceptors(FileInterceptor('foto'))
  cadastrar(
    @Body() body: CadastrarUsuario,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|jpg|png|webp)$/ }),
        ],
      }),
    )
    foto?: Express.Multer.File,
  ) {
    return this.authService.cadastrarUsuario(body, foto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginCredenciais) {
    return this.authService.loginCredenciais(body);
  }

  @Get('perfil')
  @UseGuards(AuthGuard)
  perfil(@Request() req: { usuario: TokenPayload }) {
    return this.authService.perfilUsuario(req.usuario.sub);
  }
}
