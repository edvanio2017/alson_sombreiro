import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ROLE_LABELS, ROLES } from '@alson/shared';
import { ZodValidationPipe } from '../../../shared/presentation/pipes/zod-validation.pipe';
import { CurrentUser } from '../../../shared/presentation/decorators/current-user.decorator';
import type { ActorContext } from '../../../shared/application/pagination';
import { ManageUsersUseCase } from '../application/use-cases/manage-users.use-case';
import { Roles } from './decorators/roles.decorator';
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  CreateUserBody,
  type CreateUserInputDto,
  type ListUsersQuery,
  type UpdateUserInputDto,
} from './dto/auth.dto';

@ApiTags('Utilizadores')
@ApiBearerAuth()
@Controller('users')
// A gestão de contas é exclusiva do administrador.
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly users: ManageUsersUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Listar utilizadores do backoffice' })
  @ApiResponse({ status: 200, description: 'Lista paginada de utilizadores.' })
  list(@Query(new ZodValidationPipe(listUsersQuerySchema)) query: ListUsersQuery) {
    return this.users.list(
      { search: query.search, role: query.role, active: query.active },
      { page: query.page, perPage: query.perPage },
    );
  }

  @Get('roles')
  @ApiOperation({ summary: 'Perfis disponíveis e respectivas designações' })
  listRoles() {
    return ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter um utilizador' })
  @ApiResponse({ status: 404, description: 'Utilizador não encontrado.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar utilizador' })
  @ApiBody({ type: CreateUserBody })
  @ApiResponse({ status: 201, description: 'Utilizador criado; convite enviado por e-mail.' })
  @ApiResponse({ status: 409, description: 'E-mail já registado.' })
  create(
    @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInputDto,
    @CurrentUser() actor: ActorContext,
  ) {
    return this.users.create(body, actor);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar utilizador' })
  @ApiResponse({ status: 200, description: 'Utilizador actualizado.' })
  @ApiResponse({ status: 422, description: 'Regra de negócio violada (ex.: último administrador).' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserInputDto,
    @CurrentUser() actor: ActorContext,
  ) {
    return this.users.update(id, body, actor);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Repor a palavra-passe de um utilizador' })
  @ApiResponse({ status: 200, description: 'Palavra-passe temporária gerada e enviada.' })
  resetPassword(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: ActorContext) {
    return this.users.resetPassword(id, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover utilizador (remoção lógica)' })
  @ApiResponse({ status: 204, description: 'Utilizador removido.' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: ActorContext,
  ): Promise<void> {
    await this.users.remove(id, actor);
  }
}
