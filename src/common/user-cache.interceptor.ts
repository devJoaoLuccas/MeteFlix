import { CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';
import type { TokenPayload } from 'src/auth/auth.guard';

// Cacheia por URL + usuário autenticado, para que a resposta em cache
// de um usuário nunca seja servida a outro
@Injectable()
export class UserCacheInterceptor extends CacheInterceptor {
    protected trackBy(context: ExecutionContext): string | undefined {
        const baseKey = super.trackBy(context);

        if (!baseKey) {
            return undefined;
        }

        const request = context.switchToHttp().getRequest<{ usuario?: TokenPayload }>();
        const usuarioId = request.usuario?.sub;

        // sem usuário identificado nao cacheia, para nao vazar resposta entre usuários
        return usuarioId ? `${baseKey}:user:${usuarioId}` : undefined;
    }
}
