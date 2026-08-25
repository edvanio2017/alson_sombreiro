import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from '@alson/shared';
import { UnauthorizedError } from '../../../shared/domain/domain-error';
import type { ActorContext } from '../../../shared/application/pagination';
import { USER_REPOSITORY, type UserRepository } from '../domain/repositories/user.repository';

/**
 * Valida o access token e reconfirma o estado do utilizador em base de dados.
 *
 * A revalidação por pedido é deliberada: uma conta desactivada ou com o perfil
 * alterado deixa de ter acesso de imediato, sem esperar pela expiração do token.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: JwtPayload): Promise<ActorContext> {
    const user = await this.users.findById(payload.sub);

    if (!user || !user.canAuthenticate) {
      throw new UnauthorizedError('Sessão inválida. Inicie sessão novamente.');
    }

    return { userId: user.id, email: user.email, role: user.role };
  }
}
