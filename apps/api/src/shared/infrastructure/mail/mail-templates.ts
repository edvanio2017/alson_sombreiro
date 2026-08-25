import { formatDate } from '@alson/shared';

/**
 * Templates de e-mail em HTML inline.
 *
 * A identidade da Alson Sombreiro é monocromática (grafite/prata sobre branco),
 * por isso os e-mails usam a mesma linguagem visual, sem imagens externas,
 * que a maioria dos clientes de e-mail bloqueia por omissão.
 */

interface LayoutOptions {
  title: string;
  preheader: string;
  body: string;
  footerNote?: string;
  siteUrl: string;
  companyName: string;
}

function layout({ title, preheader, body, footerNote, siteUrl, companyName }: LayoutOptions): string {
  return `<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#18181b;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:4px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#18181b 0%,#3f3f46 100%);padding:28px 32px;">
              <div style="color:#ffffff;font-size:18px;letter-spacing:0.22em;font-weight:600;text-transform:uppercase;">Alson Sombreiro</div>
              <div style="color:#a1a1aa;font-size:10px;letter-spacing:0.36em;text-transform:uppercase;margin-top:6px;">Imobiliária · Consultadoria</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="background-color:#fafafa;border-top:1px solid #e4e4e7;padding:22px 32px;color:#71717a;font-size:12px;line-height:1.7;">
              ${footerNote ? `<p style="margin:0 0 12px;">${footerNote}</p>` : ''}
              <p style="margin:0;"><strong style="color:#3f3f46;">${escapeHtml(companyName)}</strong></p>
              <p style="margin:4px 0 0;">Sede: Rua Alexandre Herculano n.º 35, Benguela · Filiais: Luanda e Huambo</p>
              <p style="margin:4px 0 0;">+244 923 075 864 · <a href="${siteUrl}" style="color:#3f3f46;">${siteUrl.replace(/^https?:\/\//, '')}</a></p>
              <p style="margin:12px 0 0;color:#a1a1aa;">Mensagem automática. Por favor, não responda a este endereço.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function referenceBox(reference: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td align="center" style="border:1px dashed #d4d4d8;border-radius:4px;padding:20px;background-color:#fafafa;">
        <div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#71717a;">Número de referência</div>
        <div style="font-size:26px;font-weight:700;letter-spacing:0.08em;color:#18181b;margin-top:8px;font-family:'SFMono-Regular',Menlo,Consolas,monospace;">${escapeHtml(reference)}</div>
      </td>
    </tr>
  </table>`;
}

function valuesTable(values: Array<{ label: string; displayValue: string }>): string {
  if (values.length === 0) return '';
  const rows = values
    .map(
      (item) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;color:#71717a;font-size:13px;width:42%;vertical-align:top;">${escapeHtml(item.label)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;color:#18181b;font-size:13px;vertical-align:top;">${escapeHtml(item.displayValue)}</td>
      </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">${rows}</table>`;
}

interface CommonContext {
  siteUrl: string;
  companyName: string;
}

/** Confirmação enviada ao requerente logo após a submissão. */
export function requestConfirmationTemplate(params: {
  requesterName: string;
  reference: string;
  serviceName: string;
  submittedAt: Date;
  values: Array<{ label: string; displayValue: string }>;
  attachmentCount: number;
  ctx: CommonContext;
}): { subject: string; html: string; text: string } {
  const body = `
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#18181b;">Recebemos o seu pedido</h1>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#3f3f46;">Estimado(a) ${escapeHtml(params.requesterName)},</p>
    <p style="margin:0;font-size:15px;line-height:1.7;color:#3f3f46;">
      Confirmamos a recepção do seu pedido de <strong>${escapeHtml(params.serviceName)}</strong>,
      submetido a ${formatDate(params.submittedAt, true)}. Guarde o número de referência abaixo:
      será necessário em qualquer contacto sobre este processo.
    </p>
    ${referenceBox(params.reference)}
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#71717a;">Resumo do pedido</p>
    ${valuesTable(params.values)}
    ${
      params.attachmentCount > 0
        ? `<p style="margin:16px 0 0;font-size:13px;color:#71717a;">${params.attachmentCount} documento(s) anexado(s) com sucesso.</p>`
        : ''
    }
    <p style="margin:24px 0 0;font-size:15px;line-height:1.7;color:#3f3f46;">
      A nossa equipa irá analisar o pedido e entrará em contacto consigo em breve.
      Será notificado por e-mail sempre que houver um avanço relevante no processo.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
      <tr>
        <td style="background-color:#18181b;border-radius:3px;">
          <a href="${params.ctx.siteUrl}/pedido/${encodeURIComponent(params.reference)}"
             style="display:inline-block;padding:13px 26px;color:#ffffff;text-decoration:none;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;">
            Consultar estado do pedido
          </a>
        </td>
      </tr>
    </table>`;

  return {
    subject: `Pedido ${params.reference} recebido (${params.serviceName})`,
    html: layout({
      title: 'Pedido recebido',
      preheader: `O seu pedido ${params.reference} foi recebido com sucesso.`,
      body,
      siteUrl: params.ctx.siteUrl,
      companyName: params.ctx.companyName,
    }),
    text: `Estimado(a) ${params.requesterName},\n\nRecebemos o seu pedido de ${params.serviceName}.\nReferência: ${params.reference}\nData: ${formatDate(params.submittedAt, true)}\n\nConsulte o estado em ${params.ctx.siteUrl}/pedido/${params.reference}\n\n${params.ctx.companyName}`,
  };
}

/** Notificação ao requerente quando o estado do pedido muda. */
export function statusChangedTemplate(params: {
  requesterName: string;
  reference: string;
  serviceName: string;
  fromStatus: string;
  toStatus: string;
  statusColor: string;
  changedAt: Date;
  ctx: CommonContext;
}): { subject: string; html: string; text: string } {
  const body = `
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#18181b;">Actualização do seu pedido</h1>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#3f3f46;">Estimado(a) ${escapeHtml(params.requesterName)},</p>
    <p style="margin:0;font-size:15px;line-height:1.7;color:#3f3f46;">
      O seu pedido <strong>${escapeHtml(params.reference)}</strong>
      (${escapeHtml(params.serviceName)}) mudou de estado a ${formatDate(params.changedAt, true)}.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #e4e4e7;border-radius:4px;">
      <tr>
        <td align="center" style="padding:22px;">
          <span style="display:inline-block;padding:7px 16px;border:1px solid #e4e4e7;border-radius:999px;color:#a1a1aa;font-size:13px;">${escapeHtml(params.fromStatus)}</span>
          <span style="display:inline-block;padding:0 12px;color:#d4d4d8;font-size:18px;">&rarr;</span>
          <span style="display:inline-block;padding:7px 16px;border-radius:999px;background-color:${escapeHtml(params.statusColor)};color:#ffffff;font-size:13px;font-weight:600;">${escapeHtml(params.toStatus)}</span>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:#18181b;border-radius:3px;">
          <a href="${params.ctx.siteUrl}/pedido/${encodeURIComponent(params.reference)}"
             style="display:inline-block;padding:13px 26px;color:#ffffff;text-decoration:none;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;">
            Ver detalhes
          </a>
        </td>
      </tr>
    </table>`;

  return {
    subject: `Pedido ${params.reference}: ${params.toStatus}`,
    html: layout({
      title: 'Actualização do pedido',
      preheader: `O pedido ${params.reference} passou para "${params.toStatus}".`,
      body,
      siteUrl: params.ctx.siteUrl,
      companyName: params.ctx.companyName,
    }),
    text: `Estimado(a) ${params.requesterName},\n\nO pedido ${params.reference} (${params.serviceName}) mudou de "${params.fromStatus}" para "${params.toStatus}" a ${formatDate(params.changedAt, true)}.\n\nDetalhes: ${params.ctx.siteUrl}/pedido/${params.reference}\n\n${params.ctx.companyName}`,
  };
}

/** Aviso interno à equipa sempre que entra um pedido novo. */
export function newRequestInternalTemplate(params: {
  reference: string;
  serviceName: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string | null;
  values: Array<{ label: string; displayValue: string }>;
  adminUrl: string;
  requestId: string;
  ctx: CommonContext;
}): { subject: string; html: string; text: string } {
  const body = `
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#18181b;">Novo pedido submetido</h1>
    <p style="margin:0;font-size:15px;line-height:1.7;color:#3f3f46;">
      Entrou um novo pedido de <strong>${escapeHtml(params.serviceName)}</strong> através do site.
    </p>
    ${referenceBox(params.reference)}
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#71717a;">Requerente</p>
    ${valuesTable([
      { label: 'Nome', displayValue: params.requesterName },
      { label: 'E-mail', displayValue: params.requesterEmail },
      { label: 'Telefone', displayValue: params.requesterPhone ?? 'Não indicado' },
    ])}
    <p style="margin:24px 0 8px;font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#71717a;">Dados do formulário</p>
    ${valuesTable(params.values)}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
      <tr>
        <td style="background-color:#18181b;border-radius:3px;">
          <a href="${params.adminUrl}/pedidos/${params.requestId}"
             style="display:inline-block;padding:13px 26px;color:#ffffff;text-decoration:none;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;">
            Abrir no backoffice
          </a>
        </td>
      </tr>
    </table>`;

  return {
    subject: `[Novo pedido] ${params.reference} (${params.serviceName})`,
    html: layout({
      title: 'Novo pedido',
      preheader: `${params.requesterName} submeteu um pedido de ${params.serviceName}.`,
      body,
      siteUrl: params.ctx.siteUrl,
      companyName: params.ctx.companyName,
    }),
    text: `Novo pedido ${params.reference} (${params.serviceName})\nRequerente: ${params.requesterName} · ${params.requesterEmail} · ${params.requesterPhone ?? 'Não indicado'}\n\nBackoffice: ${params.adminUrl}/pedidos/${params.requestId}`,
  };
}

/** Credenciais iniciais de um utilizador do backoffice. */
export function userInviteTemplate(params: {
  name: string;
  email: string;
  temporaryPassword: string;
  roleLabel: string;
  adminUrl: string;
  ctx: CommonContext;
}): { subject: string; html: string; text: string } {
  const body = `
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#18181b;">Acesso ao backoffice</h1>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#3f3f46;">Estimado(a) ${escapeHtml(params.name)},</p>
    <p style="margin:0;font-size:15px;line-height:1.7;color:#3f3f46;">
      Foi criada uma conta para si no backoffice da ${escapeHtml(params.ctx.companyName)}
      com o perfil <strong>${escapeHtml(params.roleLabel)}</strong>.
    </p>
    ${valuesTable([
      { label: 'E-mail', displayValue: params.email },
      { label: 'Palavra-passe temporária', displayValue: params.temporaryPassword },
    ])}
    <p style="margin:20px 0 0;font-size:14px;line-height:1.7;color:#b45309;background-color:#fffbeb;border-left:3px solid #f59e0b;padding:12px 14px;">
      Por segurança, altere a palavra-passe no primeiro acesso.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
      <tr>
        <td style="background-color:#18181b;border-radius:3px;">
          <a href="${params.adminUrl}/login"
             style="display:inline-block;padding:13px 26px;color:#ffffff;text-decoration:none;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;">
            Entrar no backoffice
          </a>
        </td>
      </tr>
    </table>`;

  return {
    subject: `Acesso ao backoffice da ${params.ctx.companyName}`,
    html: layout({
      title: 'Acesso ao backoffice',
      preheader: 'A sua conta de acesso ao backoffice foi criada.',
      body,
      siteUrl: params.ctx.siteUrl,
      companyName: params.ctx.companyName,
    }),
    text: `Estimado(a) ${params.name},\n\nConta criada no backoffice (${params.roleLabel}).\nE-mail: ${params.email}\nPalavra-passe temporária: ${params.temporaryPassword}\n\nAltere a palavra-passe no primeiro acesso: ${params.adminUrl}/login`,
  };
}
