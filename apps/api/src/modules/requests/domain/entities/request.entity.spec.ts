import { BusinessRuleError, ValidationError } from '../../../../shared/domain/domain-error';
import { RequestStatus } from './request-status.entity';
import { Request, type RequestProps } from './request.entity';

const status = (overrides: Partial<Parameters<typeof RequestStatus.create>[1]> = {}, id = 's1') =>
  RequestStatus.create(id, {
    key: 'novo',
    name: 'Novo',
    color: '#3F3F46',
    order: 0,
    isInitial: true,
    isFinal: false,
    notifyRequester: false,
    active: true,
    ...overrides,
  });

const props = (overrides: Partial<RequestProps> = {}): RequestProps => ({
  reference: 'AS-2026-000001',
  serviceId: 'servico-1',
  serviceName: 'Avaliação Imobiliária',
  status: status(),
  assigneeId: null,
  priority: 'NORMAL',
  requester: { name: 'Maria Chipenda', email: 'maria@exemplo.ao', phone: null },
  closedAt: null,
  createdAt: new Date('2026-01-10T10:00:00Z'),
  updatedAt: new Date('2026-01-10T10:00:00Z'),
  ...overrides,
});

describe('Request (raiz de agregado)', () => {
  it('rejeita referências fora do formato AS-AAAA-NNNNNN', () => {
    expect(() => Request.create('r1', props({ reference: '12345' }))).toThrow(ValidationError);
  });

  describe('transição de estado', () => {
    it('altera o estado e devolve a origem e o destino', () => {
      const request = Request.create('r1', props());
      const emAnalise = status({ key: 'em_analise', name: 'Em análise', isInitial: false }, 's2');

      const { from, to } = request.transitionTo(emAnalise);

      expect(from.name).toBe('Novo');
      expect(to.name).toBe('Em análise');
      expect(request.status.id).toBe('s2');
    });

    it('recusa a transição para o estado actual', () => {
      const request = Request.create('r1', props());

      expect(() => request.transitionTo(status())).toThrow(BusinessRuleError);
    });

    it('recusa a transição para um estado desactivado', () => {
      const request = Request.create('r1', props());
      const inactivo = status({ key: 'arquivado', name: 'Arquivado', isInitial: false, active: false }, 's9');

      expect(() => request.transitionTo(inactivo)).toThrow(
        /está desactivado e não pode ser atribuído/,
      );
    });

    it('marca o pedido como fechado ao entrar num estado final', () => {
      const request = Request.create('r1', props());
      const concluido = status(
        { key: 'concluido', name: 'Concluído', isInitial: false, isFinal: true },
        's6',
      );

      request.transitionTo(concluido);

      expect(request.isClosed).toBe(true);
      expect(request.resolutionDays).not.toBeNull();
    });

    it('permite recuar no pipeline e reabre o pedido', () => {
      const concluido = status(
        { key: 'concluido', name: 'Concluído', isInitial: false, isFinal: true },
        's6',
      );
      const request = Request.create('r1', props({ status: concluido, closedAt: new Date() }));

      request.transitionTo(status());

      expect(request.isClosed).toBe(false);
      expect(request.resolutionDays).toBeNull();
    });
  });

  describe('notificação ao requerente', () => {
    it('notifica quando o estado de destino o determina', () => {
      const request = Request.create('r1', props());
      const notificavel = status(
        { key: 'em_analise', name: 'Em análise', isInitial: false, notifyRequester: true },
        's2',
      );

      expect(request.shouldNotifyRequester(notificavel)).toBe(true);
    });

    it('não notifica quando o estado não o determina', () => {
      const request = Request.create('r1', props());
      const silencioso = status({ key: 'triagem', name: 'Triagem', isInitial: false }, 's2');

      expect(request.shouldNotifyRequester(silencioso)).toBe(false);
    });
  });

  describe('atribuição e prioridade', () => {
    it('regista a mudança de responsável', () => {
      const request = Request.create('r1', props());

      expect(request.assignTo('user-1')).toEqual({ from: null, to: 'user-1' });
      expect(request.assigneeId).toBe('user-1');
    });

    it('recusa atribuir ao mesmo responsável', () => {
      const request = Request.create('r1', props({ assigneeId: 'user-1' }));

      expect(() => request.assignTo('user-1')).toThrow(BusinessRuleError);
    });

    it('recusa definir a prioridade que já está activa', () => {
      const request = Request.create('r1', props({ priority: 'ALTA' }));

      expect(() => request.changePriority('ALTA')).toThrow(BusinessRuleError);
      expect(request.changePriority('URGENTE')).toEqual({ from: 'ALTA', to: 'URGENTE' });
    });
  });
});

describe('RequestStatus (entidade de domínio)', () => {
  it('gera a chave a partir do nome quando não é indicada', () => {
    const created = RequestStatus.create('s1', {
      key: '',
      name: 'Proposta enviada',
      color: '#F59E0B',
      order: 3,
      isInitial: false,
      isFinal: false,
      notifyRequester: true,
      active: true,
    });

    expect(created.key).toBe('proposta_enviada');
  });

  it('rejeita cores fora do formato hexadecimal', () => {
    expect(() =>
      RequestStatus.create('s1', {
        key: 'novo',
        name: 'Novo',
        color: 'azul',
        order: 0,
        isInitial: true,
        isFinal: false,
        notifyRequester: false,
        active: true,
      }),
    ).toThrow(ValidationError);
  });

  it('rejeita um estado simultaneamente inicial e final', () => {
    expect(() =>
      RequestStatus.create('s1', {
        key: 'novo',
        name: 'Novo',
        color: '#000000',
        order: 0,
        isInitial: true,
        isFinal: true,
        notifyRequester: false,
        active: true,
      }),
    ).toThrow(ValidationError);
  });
});
