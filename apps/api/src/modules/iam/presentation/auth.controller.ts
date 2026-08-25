import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ZodValidationPipe } from '../../../shared/presentation/pipes/zod-validation.pipe';
import { LOGIN_THROTTLE, REFRESH_THROTTLE } from '../../../config/throttle';
import { CurrentUser, RequestOrigin } from '../../../shared/presentation/decorators/current-user.decorator';
import type { ActorContext } from '../../../shared/application/pagination';
import { AuthenticateUseCase } from '../application/use-cases/authenticate.use-case';
import { LogoutUseCase } from '../application/use-cases/logout.use-case';
import { RefreshSessionUseCase } from '../application/use-cases/refresh-session.use-case';
import { ManageUsersUseCase } from '../application/use-cases/manage-users.use-case';
import { Public } from './decorators/public.decorator';
import {
  changePasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  LoginBody,
  RefreshBody,
  type ChangePasswordInput,
  type LoginInput,
  type LogoutInput,
  type RefreshInput,
} from './dto/auth.dto';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authenticate: AuthenticateUseCase,
    private readonly refreshSession: RefreshSessionUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly users: ManageUsersUseCase,
  ) {}

  @Public()
  // Limite apertado sobre o login, configurável por LOGIN_THROTTLE_LIMIT/TTL.
  @Throttle({ default: LOGIN_THROTTLE })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sessão no backoffice' })
  @ApiBody({ type: LoginBody })
  @ApiResponse({ status: 200, description: 'Sessão iniciada; devolve tokens e utilizador.' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas.' })
  @ApiResponse({ status: 403, description: 'Conta desactivada.' })
  login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @RequestOrigin() origin: { ip?: string; userAgent?: string },
  ) {
    return this.authenticate.execute({
      email: body.email,
      password: body.password,
      ipAddress: origin.ip,
      userAgent: origin.userAgent,
    });
  }

  @Public()
  @Throttle({ default: REFRESH_THROTTLE })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar a sessão (rotação de refresh token)' })
  @ApiBody({ type: RefreshBody })
  @ApiResponse({ status: 200, description: 'Novo par de tokens.' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido, expirado ou já usado.' })
  refresh(
    @Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput,
    @RequestOrigin() origin: { ip?: string; userAgent?: string },
  ) {
    return this.refreshSession.execute({
      refreshToken: body.refreshToken,
      ipAddress: origin.ip,
      userAgent: origin.userAgent,
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Terminar a sessão actual ou todas as sessões' })
  @ApiResponse({ status: 204, description: 'Sessão terminada.' })
  async logout(
    @CurrentUser() actor: ActorContext,
    @Body(new ZodValidationPipe(logoutSchema)) body: LogoutInput,
  ): Promise<void> {
    await this.logoutUseCase.execute(actor, body.refreshToken, body.allSessions);
  }

  @Get('me')
  @ApiOperation({ summary: 'Dados do utilizador autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil do utilizador da sessão.' })
  me(@CurrentUser() actor: ActorContext) {
    return this.users.findById(actor.userId);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Alterar a própria palavra-passe' })
  @ApiResponse({ status: 204, description: 'Palavra-passe alterada; sessões terminadas.' })
  @ApiResponse({ status: 422, description: 'Palavra-passe actual incorrecta.' })
  async changePassword(
    @CurrentUser() actor: ActorContext,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput,
  ): Promise<void> {
    await this.users.changePassword(actor.userId, body.currentPassword, body.newPassword, actor);
  }
}
