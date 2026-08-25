# Contrato da API Alson Sombreiro

Base URL local: `http://localhost:3333/api`
Documentação interactiva (apenas fora de produção): `http://localhost:3333/api/docs`

Todas as respostas são `application/json` com codificação UTF-8. Datas em ISO 8601 (UTC).

---

## Índice

1. [Convenções](#1-convenções)
2. [Autenticação](#2-autenticação)
3. [Endpoints públicos](#3-endpoints-públicos-sem-autenticação)
4. [Backoffice · Pedidos](#4-backoffice--pedidos)
5. [Backoffice · Serviços e formulários](#5-backoffice--serviços-e-formulários)
6. [Backoffice · Pipeline de estados](#6-backoffice--pipeline-de-estados)
7. [Backoffice · Utilizadores](#7-backoffice--utilizadores)
8. [Backoffice · Dashboard e auditoria](#8-backoffice--dashboard-e-auditoria)
9. [Rate limiting](#9-rate-limiting)

---

## 1. Convenções

### Autenticação

Todos os endpoints exigem `Authorization: Bearer <accessToken>`, **excepto** os que
estão sob `/public` e `/health`.

### Perfis (RBAC)

Hierárquicos: `ADMIN` > `GESTOR` > `AGENTE`. Um endpoint que exige `GESTOR` aceita
também `ADMIN`.

### Formato de erro

Todos os erros seguem a mesma forma:

```json
{
  "statusCode": 400,
  "error": "VALIDATION_ERROR",
  "message": "Não foi possível submeter o pedido. Verifique os campos assinalados.",
  "details": {
    "area_m2": ["O valor mínimo é 1."],
    "provincia": ["Seleccione uma das opções disponíveis."]
  },
  "timestamp": "2026-08-25T10:14:22.517Z",
  "path": "/api/public/requests/avaliacao-imobiliaria"
}
```

`details` está presente sempre que existam erros por campo, indexados pela chave do
campo, prontos a ligar directamente à interface.

### Códigos de resposta

| Código | Significado |
|--------|-------------|
| `200` | Operação concluída |
| `201` | Recurso criado |
| `202` | Aceite para processamento (envio de e-mail) |
| `204` | Concluído sem corpo de resposta |
| `400` | Dados inválidos (`details` por campo) |
| `401` | Sem autenticação, token inválido ou expirado |
| `403` | Autenticado mas sem permissões, ou conta desactivada |
| `404` | Recurso inexistente |
| `409` | Conflito (ex.: e-mail já registado) |
| `422` | Regra de negócio violada |
| `429` | Limite de pedidos excedido |
| `500` | Erro interno |

### Paginação

Endpoints de listagem aceitam `page` (≥ 1, omissão 1) e `perPage` (1–100, omissão 20)
e devolvem:

```json
{
  "items": [],
  "meta": { "page": 1, "perPage": 20, "total": 137, "totalPages": 7 }
}
```

---

## 2. Autenticação

### `POST /auth/login` · público

```json
{ "email": "admin@alsonsombreiro.ao", "password": "Alson@2026" }
```

**200**

```json
{
  "accessToken": "eyJhbGciOi…",
  "refreshToken": "eyJhbGciOi…",
  "expiresIn": 900,
  "user": {
    "id": "3f2a…",
    "name": "Jorge Bento",
    "email": "admin@alsonsombreiro.ao",
    "role": "ADMIN",
    "active": true
  }
}
```

**401** credenciais inválidas · **403** conta desactivada · **429** demasiadas tentativas

> A resposta não distingue e-mail inexistente de palavra-passe errada, e a comparação
> de hash corre mesmo sem utilizador, o que impede a enumeração de contas.

### `POST /auth/refresh` · público

```json
{ "refreshToken": "eyJhbGciOi…" }
```

**200**: novo par de tokens (mesma forma de `/auth/login`).

> Rotação obrigatória: o refresh token usado é revogado. Reutilizar um token já
> consumido devolve **401**.

### `POST /auth/logout` · autenticado

```json
{ "refreshToken": "eyJhbGciOi…", "allSessions": false }
```

**204**: idempotente.

### `GET /auth/me` · autenticado

**200**: `UserSummaryDto` do utilizador da sessão.

### `POST /auth/change-password` · autenticado

```json
{ "currentPassword": "…", "newPassword": "…", "confirmPassword": "…" }
```

**204**: todas as sessões do utilizador são revogadas.
**422**: palavra-passe actual incorrecta.

Política: mínimo 8 caracteres, com maiúscula, minúscula e algarismo.

---

## 3. Endpoints públicos (sem autenticação)

### `GET /public/services`

Query: `featured=true|false` (opcional).

**200**

```json
[
  {
    "id": "5338…",
    "slug": "avaliacao-imobiliaria",
    "name": "Avaliação Imobiliária",
    "shortDescription": "Determinação rigorosa do valor de mercado…",
    "icon": "chart-bar",
    "coverImage": null,
    "featured": true,
    "order": 1,
    "active": true
  }
]
```

Só devolve serviços publicados.

### `GET /public/services/sitemap`

**200**: `[{ "slug": "…", "updatedAt": "2026-08-25T…" }]`. Alimenta o `sitemap.xml`.

### `GET /public/services/:slug`

**200**: detalhe do serviço **com o schema do formulário**:

```json
{
  "id": "5338…",
  "slug": "avaliacao-imobiliaria",
  "name": "Avaliação Imobiliária",
  "shortDescription": "…",
  "description": "…",
  "benefits": ["Perito avaliador inscrito na CMC…"],
  "metaTitle": "Avaliação Imobiliária em Angola | Alson Sombreiro",
  "metaDescription": "…",
  "ogImage": null,
  "featured": true,
  "order": 1,
  "active": true,
  "createdAt": "2026-08-24T…",
  "updatedAt": "2026-08-25T…",
  "fields": [
    {
      "id": "a1b2…",
      "key": "tipo_imovel",
      "label": "Tipo de imóvel",
      "type": "SELECT",
      "placeholder": null,
      "helpText": null,
      "required": true,
      "order": 0,
      "width": 1,
      "options": [{ "label": "Apartamento", "value": "apartamento" }],
      "validation": {},
      "active": true
    }
  ]
}
```

**404**: slug inexistente ou serviço não publicado.

#### Tipos de campo

`TEXT` · `TEXTAREA` · `NUMBER` · `DATE` · `EMAIL` · `PHONE` · `SELECT` ·
`MULTISELECT` · `CHECKBOX` · `FILE`

#### Regras de validação (`validation`)

| Chave | Aplica-se a | Descrição |
|-------|-------------|-----------|
| `min` / `max` | TEXT, TEXTAREA | Comprimento mínimo/máximo |
| `min` / `max` | NUMBER | Valor mínimo/máximo |
| `decimals` | NUMBER | Casas decimais (`0` = inteiro) |
| `pattern` / `patternMessage` | TEXT, PHONE | Expressão regular e mensagem |
| `minDate` / `maxDate` | DATE | Intervalo (`AAAA-MM-DD`) |
| `minItems` / `maxItems` | MULTISELECT, FILE | Nº de itens |
| `acceptedExtensions` | FILE | `["pdf","png"]` |
| `acceptedMimeTypes` | FILE | Lista de mime types |
| `maxFileSize` | FILE | Bytes por ficheiro |

### `POST /public/requests/:serviceSlug`

Aceita `application/json` **ou** `multipart/form-data`.

**JSON** (sem anexos):

```json
{
  "requester": { "name": "Maria Chipenda", "email": "maria@exemplo.ao", "phone": "+244 923 111 222" },
  "data": {
    "tipo_imovel": "apartamento",
    "provincia": "benguela",
    "municipio": "Lobito",
    "area_m2": "145",
    "endereco": "Rua da Restinga n.º 12",
    "finalidade": "credito"
  },
  "consent": true,
  "website": "",
  "renderedAt": 1756100000000
}
```

**multipart/form-data** (com anexos):

| Campo | Conteúdo |
|-------|----------|
| `payload` | O JSON acima, como texto |
| `<chave_do_campo>` | Um ou mais ficheiros (o nome do campo é a `key` do campo FILE) |

**201**

```json
{
  "id": "d820…",
  "reference": "AS-2026-000008",
  "status": "Novo",
  "submittedAt": "2026-08-25T10:14:22.517Z",
  "message": "Pedido submetido com sucesso. Enviámos a confirmação para o e-mail indicado…"
}
```

**400**: `details` com os erros por chave de campo
**404**: serviço inexistente ou não publicado
**422**: bloqueado pelo anti-spam, ou serviço sem formulário definido
**429**: limite de 5 submissões por hora e por IP

**Anti-spam:** `website` é um campo-armadilha que tem de chegar vazio; `renderedAt`
é o instante (epoch ms) em que o formulário foi apresentado; submissões abaixo de
3 s são recusadas.

### `GET /public/requests/track`

Query: `reference` (`AS-AAAA-NNNNNN`) e `email`, ambos obrigatórios.

**200**

```json
{
  "reference": "AS-2026-000008",
  "serviceName": "Avaliação Imobiliária",
  "status": { "name": "Em triagem", "color": "#6366F1", "isFinal": false },
  "submittedAt": "2026-08-25T10:14:22.517Z",
  "updatedAt": "2026-08-25T11:02:10.004Z",
  "timeline": [
    { "description": "Estado actualizado para \"Em triagem\".", "date": "2026-08-25T11:02:10.004Z" },
    { "description": "Pedido recebido.", "date": "2026-08-25T10:14:22.517Z" }
  ],
  "attachmentCount": 2
}
```

**404**: a referência e o e-mail não correspondem a nenhum pedido.

> A vista pública nunca inclui notas internas, responsável atribuído ou os valores
> submetidos.

### `POST /public/contact`

```json
{
  "name": "Ana Ferreira",
  "email": "ana@exemplo.ao",
  "phone": "+244 923 000 111",
  "subject": "Pedido de informação",
  "message": "Gostaria de saber…",
  "consent": true,
  "website": "",
  "renderedAt": 1756100000000
}
```

**202** · **429** limite de 5 mensagens por hora e por IP.

### `GET /health`

**200**: `{ "status": "ok", "database": "up", "timestamp": "…", "uptime": 4213 }`

---

## 4. Backoffice · Pedidos

Todos exigem `AGENTE` ou superior, salvo indicação em contrário.

### `GET /requests`

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `search` | string | Referência, nome, e-mail, telefone **ou** conteúdo das respostas |
| `serviceId` | uuid | |
| `statusId` | uuid | |
| `assigneeId` | uuid \| `unassigned` | |
| `priority` | `BAIXA`\|`NORMAL`\|`ALTA`\|`URGENTE` | |
| `dateFrom` / `dateTo` | data ISO | Intervalo de submissão |
| `openOnly` | `true`\|`false` | Esconde estados finais |
| `sort` | `createdAt`\|`updatedAt`\|`priority`\|`reference` | omissão `createdAt` |
| `direction` | `asc`\|`desc` | omissão `desc` |
| `page`, `perPage` | número | |

**200**: `PaginatedResult<RequestListItemDto>`.

### `GET /requests/kanban`

Aceita os mesmos filtros excepto `statusId` (as colunas *são* os estados), mais
`limitPerColumn` (1–200, omissão 50).

**200**

```json
[
  {
    "status": { "id": "b78d…", "key": "novo", "name": "Novo", "color": "#3F3F46", "order": 0 },
    "total": 12,
    "items": [ /* RequestListItemDto */ ]
  }
]
```

### `GET /requests/priorities`

**200**: `[{ "value": "NORMAL", "label": "Normal" }]`

### `GET /requests/:id`

**200**: `RequestDetailDto`: os campos da listagem mais `values`, `attachments`,
`history` (mais recente primeiro) e `notes`.

### `PATCH /requests/:id/status`

```json
{ "statusId": "862c…", "note": "Documentação recebida e conferida." }
```

**200**: pedido actualizado.
**422**: estado igual ao actual, ou estado desactivado.

> Regista a alteração na timeline com autor e data. Se o estado de destino tiver
> `notifyRequester: true`, envia e-mail ao requerente.

### `PATCH /requests/:id/assignee`

```json
{ "assigneeId": "9c1f…" }
```

`null` remove a atribuição. **200** · **404** utilizador inexistente ou inactivo.

### `PATCH /requests/:id/priority`

```json
{ "priority": "ALTA" }
```

**200** · **422** prioridade já activa.

### Notas internas

| Método | Rota | Corpo | Notas |
|--------|------|-------|-------|
| `POST` | `/requests/:id/notes` | `{ "body": "…" }` | **201** |
| `PATCH` | `/requests/:id/notes/:noteId` | `{ "body": "…" }` | Só autor ou `ADMIN` |
| `DELETE` | `/requests/:id/notes/:noteId` | (vazio) | Só autor ou `ADMIN`; remoção lógica |

**403**: a nota pertence a outro utilizador.

### Anexos

| Método | Rota | Notas |
|--------|------|-------|
| `POST` | `/requests/:id/attachments` | `multipart/form-data`, campo `files`. **201** |
| `GET` | `/requests/:id/attachments/:attachmentId` | Devolve o binário |
| `DELETE` | `/requests/:id/attachments/:attachmentId` | `GESTOR`+; remoção lógica. **204** |

---

## 5. Backoffice · Serviços e formulários

### `GET /services` · `AGENTE`

Query: `search`, `active`, `featured`, `page`, `perPage`.
**200**: `PaginatedResult<ServiceSummaryDto & { fieldCount }>`. Inclui rascunhos.

### `GET /services/field-types` · `AGENTE`

**200**: `[{ "value": "TEXT", "label": "Texto" }]`

### `GET /services/:id` · `AGENTE`

**200**: `ServiceDetailDto` com **todos** os campos, incluindo desactivados.

### `POST /services` · `GESTOR`

```json
{
  "name": "Vistoria Técnica de Imóveis",
  "shortDescription": "Inspecção técnica ao estado de conservação do imóvel.",
  "description": "…",
  "benefits": ["…"],
  "metaTitle": "…",
  "metaDescription": "…",
  "featured": false,
  "order": 9
}
```

**201**: o `slug` é gerado a partir do nome (com sufixo numérico se já existir) e o
serviço nasce **despublicado** (`active: false`).

### `PATCH /services/:id` · `GESTOR`

Mesmos campos, todos opcionais, mais `active`.

**422**: tentativa de publicar (`active: true`) um serviço sem campos activos.

### `DELETE /services/:id` · `ADMIN`

**204** · **422**: existem pedidos associados (despublique em alternativa).

### Construtor de formulários

#### `GET /services/:id/fields` · `AGENTE`

**200**: `FormFieldDto[]` ordenado.

#### `POST /services/:id/fields` · `GESTOR`

```json
{
  "key": "numero_bi",
  "label": "Número do Bilhete de Identidade",
  "type": "TEXT",
  "placeholder": "000000000LA000",
  "helpText": "Conforme consta no documento de identificação.",
  "required": true,
  "width": 1,
  "options": [],
  "validation": {
    "pattern": "^[0-9]{9}[A-Za-z]{2}[0-9]{3}$",
    "patternMessage": "Formato esperado: 9 algarismos, 2 letras e 3 algarismos."
  },
  "active": true
}
```

`key` é opcional: se omitida, é derivada do `label`.

**201** · **400** definição inválida (ex.: `SELECT` sem opções, `min > max`,
expressão regular inválida, chave duplicada no serviço).

#### `PATCH /services/:id/fields/:fieldId` · `GESTOR`

**422**: tentativa de alterar a `key` de um campo já respondido em pedidos.

#### `PATCH /services/:id/fields/reorder` · `GESTOR`

```json
{ "fieldIds": ["a1b2…", "c3d4…", "e5f6…"] }
```

Tem de incluir **todos** os campos do serviço. **200**: lista reordenada.

#### `POST /services/:id/fields/:fieldId/duplicate` · `GESTOR`

**201**: cópia com `key` sufixada (`_copia`) e rótulo `… (cópia)`.

#### `DELETE /services/:id/fields/:fieldId` · `GESTOR`

**200**: `{ "deactivated": true }` se o campo já tinha respostas (foi apenas
desactivado, preservando os dados); `{ "deactivated": false }` se foi removido.

---

## 6. Backoffice · Pipeline de estados

### `GET /request-statuses` · `AGENTE`

Query: `onlyActive=true|false`. **200**: `RequestStatusDto[]` ordenado.

### `POST /request-statuses` · `ADMIN`

```json
{
  "name": "Aguarda documentação",
  "color": "#F59E0B",
  "isInitial": false,
  "isFinal": false,
  "notifyRequester": true,
  "active": true
}
```

**201**: a `key` é derivada do nome.

### `PATCH /request-statuses/:id` · `ADMIN`

**422** quando:
- se tenta retirar a marca de inicial sem a passar a outro estado;
- se tenta desactivar o estado inicial, o último estado activo, ou um estado com
  pedidos;
- o estado seria simultaneamente inicial e final.

> Marcar um estado como inicial desmarca automaticamente o anterior: existe sempre
> exactamente um.

### `PATCH /request-statuses/reorder` · `ADMIN`

```json
{ "statusIds": ["b78d…", "862c…", "b716…"] }
```

### `DELETE /request-statuses/:id` · `ADMIN`

**204** · **422**: estado inicial, ou com pedidos associados.

---

## 7. Backoffice · Utilizadores

Todos exigem `ADMIN`.

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/users` | `search`, `role`, `active`, `page`, `perPage` |
| `GET` | `/users/roles` | `[{ "value": "ADMIN", "label": "Administrador" }]` |
| `GET` | `/users/:id` | |
| `POST` | `/users` | **201**; envia convite por e-mail |
| `PATCH` | `/users/:id` | |
| `POST` | `/users/:id/reset-password` | Gera nova palavra-passe e envia por e-mail |
| `DELETE` | `/users/:id` | **204**; remoção lógica |

### `POST /users`

```json
{
  "name": "Jorge Bento",
  "email": "jorge.bento@alsonsombreiro.ao",
  "password": "Opcional#2026",
  "phone": "+244 923 075 864",
  "role": "GESTOR",
  "sendInvite": true
}
```

Sem `password`, é gerada uma temporária e enviada por e-mail. **409** e-mail já registado.

### Regras de negócio

- Não é possível desactivar ou remover a própria conta (**422**).
- Não é possível desactivar, remover ou despromover o **único administrador activo** (**422**).
- Desactivar um utilizador, alterar-lhe o perfil ou repor a palavra-passe **revoga
  todas as suas sessões**.

---

## 8. Backoffice · Dashboard e auditoria

### `GET /dashboard/metrics` · `AGENTE`

Query: `dateFrom`, `dateTo` (opcionais).

**200**

```json
{
  "totals": {
    "total": 137,
    "abertos": 94,
    "concluidos": 41,
    "novos30Dias": 22,
    "tempoMedioResolucaoDias": 18.4
  },
  "porEstado": [{ "statusId": "…", "key": "novo", "name": "Novo", "color": "#3F3F46", "total": 12 }],
  "porServico": [{ "serviceId": "…", "name": "Avaliação Imobiliária", "slug": "…", "total": 48 }],
  "porPeriodo": [{ "periodo": "2026-08", "total": 22 }],
  "porResponsavel": [{ "userId": "…", "name": "António Kativa", "total": 31 }]
}
```

`porPeriodo` cobre sempre os últimos 12 meses. `tempoMedioResolucaoDias` é `null`
quando ainda não há pedidos concluídos.

### `GET /audit-logs` · `ADMIN`

Query: `entity`, `entityId`, `actorId`, `action`, `dateFrom`, `dateTo`, `page`, `perPage`.

**200**

```json
{
  "items": [
    {
      "id": "7a1b…",
      "entity": "Request",
      "entityId": "d820…",
      "action": "UPDATE",
      "changes": { "status": { "from": "Novo", "to": "Em triagem" } },
      "actor": { "id": "…", "name": "Jorge Bento", "email": "…", "role": "ADMIN", "active": true },
      "ipAddress": "10.0.0.1",
      "createdAt": "2026-08-25T11:02:10.004Z"
    }
  ],
  "meta": { "page": 1, "perPage": 30, "total": 412, "totalPages": 14 }
}
```

Entidades auditadas: `Request`, `Service`, `FormField`, `RequestStatus`, `User`,
`Note`, `Attachment`. Acções: `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT`.

O registo é **só de leitura**: não existe endpoint para o alterar ou apagar.

---

## 9. Rate limiting

| Âmbito | Limite | Janela |
|--------|--------|--------|
| Global (por IP) | 60 pedidos | 60 s |
| `POST /auth/login` | 10 tentativas | 60 s |
| `POST /auth/refresh` | 30 pedidos | 60 s |
| `POST /public/requests/:slug` | 5 submissões | 1 hora |
| `POST /public/contact` | 5 mensagens | 1 hora |
| `GET /public/requests/track` | 20 consultas | 60 s |

Todos os limites são configuráveis por variáveis de ambiente: `THROTTLE_TTL` /
`THROTTLE_LIMIT` (global), `PUBLIC_SUBMIT_*` (submissão e contacto),
`LOGIN_THROTTLE_*`, `REFRESH_THROTTLE_*` e `TRACK_THROTTLE_*`.

Ao exceder o limite: **429** com `Retry-After`.
