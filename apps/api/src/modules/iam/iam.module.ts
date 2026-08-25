import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthenticateUseCase } from './application/use-cases/authenticate.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { ManageUsersUseCase } from './application/use-cases/manage-users.use-case';
import { RefreshSessionUseCase } from './application/use-cases/refresh-session.use-case';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { TOKEN_SERVICE } from './application/ports/token.port';
import { USER_REPOSITORY } from './domain/repositories/user.repository';
import { REFRESH_TOKEN_REPOSITORY } from './domain/repositories/refresh-token.repository';
import { BcryptHasherService } from './infrastructure/bcrypt-hasher.service';
import { JwtTokenService } from './infrastructure/jwt-token.service';
import { PrismaRefreshTokenRepository } from './infrastructure/prisma-refresh-token.repository';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { AuthController } from './presentation/auth.controller';
import { UsersController } from './presentation/users.controller';
import { JwtStrategy } from './presentation/jwt.strategy';

/**
 * Módulo de identidade e acessos.
 *
 * As ligações entre portas (símbolos) e adaptadores concretos são declaradas
 * aqui: é o único ponto do módulo onde a aplicação conhece a infraestrutura.
 */
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({})],
  controllers: [AuthController, UsersController],
  providers: [
    AuthenticateUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
    ManageUsersUseCase,
    JwtStrategy,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptHasherService },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
  ],
  exports: [USER_REPOSITORY, ManageUsersUseCase],
})
export class IamModule {}
