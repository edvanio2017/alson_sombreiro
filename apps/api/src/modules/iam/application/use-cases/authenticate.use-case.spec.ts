import { Test } from '@nestjs/testing';
import { ForbiddenError, UnauthorizedError } from '../../../../shared/domain/domain-error';
import { AuditService } from '../../../../shared/infrastructure/audit/audit.service';
import { User } from '../../domain/entities/user.entity';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository';
import { REFRESH_TOKEN_REPOSITORY } from '../../domain/repositories/refresh-token.repository';
import { PASSWORD_HASHER } from '../ports/password-hasher.port';
import { TOKEN_SERVICE } from '../ports/token.port';
import { AuthenticateUseCase } from './authenticate.use-case';

const makeUser = (overrides: Partial<Parameters<typeof User.create>[1]> = {}) =>
  User.create('user-1', {
    name: 'Jorge Bento',
    email: 'admin@alsonsombreiro.ao',
    passwordHash: '$2a$10$hash',
    phone: null,
    avatarUrl: null,
    active: true,
    role: 'ADMIN',
    roleId: 'role-admin',
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  });

describe('AuthenticateUseCase', () => {
  let useCase: AuthenticateUseCase;
  let users: { findByEmail: jest.Mock; registerLogin: jest.Mock };
  let refreshTokens: { issue: jest.Mock; purgeExpired: jest.Mock };
  let hasher: { compare: jest.Mock };
  let tokens: { issue: jest.Mock };
  let audit: { record: jest.Mock };

  beforeEach(async () => {
    users = { findByEmail: jest.fn(), registerLogin: jest.fn().mockResolvedValue(undefined) };
    refreshTokens = {
      issue: jest.fn().mockResolvedValue(undefined),
      purgeExpired: jest.fn().mockResolvedValue(undefined),
    };
    hasher = { compare: jest.fn() };
    tokens = {
      issue: jest.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        sessionId: 'sessao-1',
        refreshExpiresAt: new Date(Date.now() + 604_800_000),
        refreshTokenHash: 'hash-do-refresh',
      }),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthenticateUseCase,
        { provide: USER_REPOSITORY, useValue: users },
        { provide: REFRESH_TOKEN_REPOSITORY, useValue: refreshTokens },
        { provide: PASSWORD_HASHER, useValue: hasher },
        { provide: TOKEN_SERVICE, useValue: tokens },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    useCase = moduleRef.get(AuthenticateUseCase);
  });

  const credentials = { email: 'admin@alsonsombreiro.ao', password: 'Alson@2026' };

  it('devolve os tokens e o utilizador quando as credenciais são válidas', async () => {
    users.findByEmail.mockResolvedValue(makeUser());
    hasher.compare.mockResolvedValue(true);

    const session = await useCase.execute(credentials);

    expect(session.accessToken).toBe('access-token');
    expect(session.user).toEqual({
      id: 'user-1',
      name: 'Jorge Bento',
      email: 'admin@alsonsombreiro.ao',
      role: 'ADMIN',
      active: true,
    });
  });

  it('guarda o hash do refresh token, nunca o token em claro', async () => {
    users.findByEmail.mockResolvedValue(makeUser());
    hasher.compare.mockResolvedValue(true);

    await useCase.execute(credentials);

    expect(refreshTokens.issue).toHaveBeenCalledWith(
      expect.objectContaining({ tokenHash: 'hash-do-refresh', userId: 'user-1' }),
    );
    const persisted = JSON.stringify(refreshTokens.issue.mock.calls[0][0]);
    expect(persisted).not.toContain('refresh-token');
  });

  it('regista o início de sessão na auditoria', async () => {
    users.findByEmail.mockResolvedValue(makeUser());
    hasher.compare.mockResolvedValue(true);

    await useCase.execute({ ...credentials, ipAddress: '10.0.0.1' });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'User', action: 'LOGIN' }),
    );
    expect(users.registerLogin).toHaveBeenCalledWith('user-1', expect.any(Date));
  });

  it('recusa credenciais erradas com mensagem genérica', async () => {
    users.findByEmail.mockResolvedValue(makeUser());
    hasher.compare.mockResolvedValue(false);

    await expect(useCase.execute(credentials)).rejects.toThrow(UnauthorizedError);
    await expect(useCase.execute(credentials)).rejects.toThrow('E-mail ou palavra-passe incorrectos.');
  });

  it('não permite distinguir um e-mail inexistente de uma palavra-passe errada', async () => {
    users.findByEmail.mockResolvedValue(null);
    hasher.compare.mockResolvedValue(false);

    await expect(useCase.execute(credentials)).rejects.toThrow('E-mail ou palavra-passe incorrectos.');
    // A comparação de hash corre mesmo sem utilizador: o tempo de resposta
    // mantém-se constante, o que impede a enumeração de contas por temporização.
    expect(hasher.compare).toHaveBeenCalled();
  });

  it('recusa contas desactivadas mesmo com a palavra-passe correcta', async () => {
    users.findByEmail.mockResolvedValue(makeUser({ active: false }));
    hasher.compare.mockResolvedValue(true);

    await expect(useCase.execute(credentials)).rejects.toThrow(ForbiddenError);
    expect(refreshTokens.issue).not.toHaveBeenCalled();
  });

  it('recusa contas removidas logicamente', async () => {
    users.findByEmail.mockResolvedValue(makeUser({ deletedAt: new Date() }));
    hasher.compare.mockResolvedValue(true);

    await expect(useCase.execute(credentials)).rejects.toThrow(ForbiddenError);
  });

  it('normaliza o e-mail antes de procurar o utilizador', async () => {
    users.findByEmail.mockResolvedValue(makeUser());
    hasher.compare.mockResolvedValue(true);

    await useCase.execute({ ...credentials, email: '  ADMIN@AlsonSombreiro.AO  ' });

    expect(users.findByEmail).toHaveBeenCalledWith('admin@alsonsombreiro.ao');
  });
});
