# Alson Sombreiro Consultadoria · Sistema Institucional

Sistema composto por dois módulos:

- **Site institucional**: apresentação da empresa, catálogo de serviços e submissão
  de pedidos através de formulários **configurados no backoffice, sem alterações de código**.
- **Backoffice com Mini CRM**: dashboard, gestão do catálogo e do construtor de
  formulários, lista e Kanban de pedidos, pipeline configurável, utilizadores e auditoria.

> Alson Sombreiro Consultadoria, Lda é uma empresa angolana constituída em 2019,
> especializada em mediação imobiliária, gestão de património e registo de imóveis.
> Sede em Benguela, filiais em Luanda e Huambo.

---

## Índice

- [Stack](#stack)
- [Arranque rápido](#arranque-rápido)
- [Estrutura do monorepo](#estrutura-do-monorepo)
- [Arquitectura](#arquitectura)
- [Formulários dinâmicos](#formulários-dinâmicos)
- [Autenticação e permissões](#autenticação-e-permissões)
- [Base de dados](#base-de-dados)
- [Testes](#testes)
- [Comandos](#comandos)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Segurança](#segurança)
- [Acessibilidade](#acessibilidade)
- [Produção](#produção)
- [Resolução de problemas](#resolução-de-problemas)

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Site público | Nuxt 4 (SSR) · Vue 3 · Tailwind CSS 4 |
| Backoffice | Nuxt 4 (SPA) · Vue 3 · Tailwind CSS 4 |
| API | NestJS 10 · Clean Architecture + DDD |
| Base de dados | PostgreSQL 16 · Prisma 5 |
| Autenticação | JWT (access + refresh com rotação) · RBAC |
| Validação | Zod, com **schema partilhado entre cliente e servidor** |
| E-mail | Nodemailer · Mailpit em desenvolvimento |
| Monorepo | pnpm workspaces · Docker Compose |

Requisitos: **Node.js ≥ 20.11**, **pnpm 9**, **Docker** (para PostgreSQL e Mailpit).

---

## Arranque rápido

```bash
# 1. Configurar o ambiente
cp .env.example .env

# 2. Instalar dependências, compilar o pacote partilhado e gerar o cliente Prisma
pnpm setup

# 3. Levantar PostgreSQL e Mailpit
docker compose up -d postgres mailpit

# 4. Aplicar migrações e popular a base de dados
pnpm db:migrate
pnpm db:seed

# 5. Arrancar os três serviços
pnpm dev
```

| Serviço | URL |
|---------|-----|
| Site institucional | http://localhost:3000 |
| Backoffice | http://localhost:3001 |
| API | http://localhost:3333/api |
| Documentação da API | http://localhost:3333/api/docs |
| Caixa de e-mail (Mailpit) | http://localhost:8025 |

### Credenciais de demonstração

Todas com a palavra-passe `Alson@2026`:

| Perfil | E-mail | Pode |
|--------|--------|------|
| Administrador | `admin@alsonsombreiro.ao` | Tudo, incluindo utilizadores, pipeline e auditoria |
| Gestor | `gestor@alsonsombreiro.ao` | Serviços, formulários e ciclo de vida dos pedidos |
| Agente | `agente@alsonsombreiro.ao` | Tratar pedidos e registar notas internas |

O seed cria 9 serviços reais da empresa com **71 campos de formulário** já
configurados, 7 estados de pipeline e 6 pedidos de exemplo.

### Alternativa: tudo em Docker

```bash
docker compose up -d          # postgres + mailpit + api (migrações automáticas)
pnpm --filter @alson/api prisma:seed
pnpm dev:web                  # os frontends correm localmente
pnpm dev:admin
```

---

## Estrutura do monorepo

```
alson-sombreiro/
├── apps/
│   ├── api/                        # NestJS · Clean Architecture + DDD
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # Modelo de dados
│   │   │   ├── migrations/         # Migrações versionadas
│   │   │   └── seed.ts             # Dados de exemplo
│   │   └── src/
│   │       ├── config/             # Configuração e validação do ambiente
│   │       ├── shared/             # Kernel partilhado
│   │       │   ├── domain/         #   entidades base, erros de domínio
│   │       │   ├── application/    #   paginação, portas (storage, mailer)
│   │       │   ├── infrastructure/ #   Prisma, auditoria, e-mail, ficheiros
│   │       │   └── presentation/   #   filtros, pipes, decoradores
│   │       └── modules/
│   │           ├── iam/            # Identidade e acessos
│   │           ├── catalog/        # Serviços + construtor de formulários
│   │           ├── requests/       # Pedidos, pipeline, anexos, dashboard
│   │           ├── audit/          # Consulta do registo de auditoria
│   │           └── contact/        # Formulário de contacto
│   │
│   ├── web/                        # Site institucional (Nuxt 4 SSR)
│   │   ├── app/
│   │   │   ├── components/         # DynamicForm, DynamicField, cabeçalho…
│   │   │   ├── composables/        # useApi, useSeo, tema do cabeçalho
│   │   │   └── pages/              # home, serviços, contacto, acompanhar…
│   │   └── server/routes/          # sitemap.xml, robots.txt
│   │
│   └── admin/                      # Backoffice (Nuxt 4 SPA)
│       └── app/
│           ├── components/         # FieldEditor, ModalDialog, badges…
│           ├── composables/        # useAuth, useApi, useToast
│           ├── middleware/         # Guarda de autenticação global
│           └── pages/              # dashboard, pedidos, kanban, serviços…
│
├── packages/
│   └── shared/                     # Contratos e motor de validação partilhados
│       └── src/
│           ├── enums.ts            # Tipos de campo, perfis, prioridades
│           ├── contracts.ts        # DTOs da API
│           ├── form-schema.ts      # ★ Construtor de schemas Zod
│           └── utils.ts            # slug, referência, datas
│
├── docs/
│   ├── API.md                      # Contrato completo da API
│   └── ARQUITETURA.md              # Decisões de arquitectura
│
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## Arquitectura

A API segue Clean Architecture com quatro camadas por módulo. A regra é uma só: **as
dependências apontam sempre para dentro**.

```
presentation/    controladores, guardas, DTOs        →  conhece application
    ↓
application/     casos de uso, portas                →  conhece domain
    ↓
domain/          entidades, regras, interfaces       →  não conhece ninguém
    ↑
infrastructure/  Prisma, JWT, bcrypt, SMTP, disco    →  implementa as portas
```

O domínio não sabe o que é HTTP, Prisma ou Nodemailer. Lança erros de domínio
(`BusinessRuleError`, `NotFoundError`, …) que o `DomainExceptionFilter` traduz em
códigos HTTP; a tradução acontece num único ficheiro.

**Ligação entre portas e adaptadores**, declarada apenas nos módulos Nest:

```ts
providers: [
  { provide: SERVICE_REPOSITORY, useClass: PrismaServiceRepository },
  { provide: STORAGE_SERVICE,    useClass: LocalStorageService },
  { provide: MAILER_SERVICE,     useClass: NodemailerService },
]
```

Trocar o armazenamento local por S3 é escrever um adaptador novo e mudar uma linha.

### Modelo de domínio

| Agregado | Raiz | Invariantes principais |
|----------|------|------------------------|
| Catálogo | `Service` | É dono dos seus `FormField`; a chave de cada campo é única no serviço; um serviço só se publica com formulário definido |
| Pedidos | `Request` | Transições de estado válidas; um estado final fecha o pedido; a notificação depende do estado de destino |
| Pipeline | `RequestStatus` | Existe sempre exactamente um estado inicial; nenhum estado é simultaneamente inicial e final |
| Identidade | `User` | E-mail válido e normalizado; contas inactivas não autenticam; ninguém se remove a si próprio |

---

## Formulários dinâmicos

É o requisito central do sistema, e a razão de existir do pacote `@alson/shared`.

### Como funciona

```
Backoffice                     API                         Site público
─────────────────────────────────────────────────────────────────────────
Gestor define os campos  →  FormField (BD)  →  GET /public/services/:slug
                                                       ↓
                                               fields: FormFieldDto[]
                                                       ↓
                                          buildFormSchema(fields) → Zod
                                                       ↓
                                        DynamicField renderiza cada campo
                                                       ↓
                                        validateFormData() no browser
                                                       ↓
                            POST /public/requests/:slug
                                       ↓
                    validateFormData() de novo, no servidor
```

O ficheiro `packages/shared/src/form-schema.ts` converte `FormFieldDto[]` num schema
Zod. **A mesma função corre no browser e na API.** Não existe uma linha de validação
duplicada: uma regra definida no backoffice vale imediatamente dos dois lados, e a
validação do cliente é conveniência; a do servidor é a autoridade.

### Tipos de campo suportados

`TEXT` · `TEXTAREA` · `NUMBER` · `DATE` · `EMAIL` · `PHONE` · `SELECT` ·
`MULTISELECT` · `CHECKBOX` · `FILE`

Por campo configuram-se rótulo, placeholder, obrigatoriedade, ordem, largura, texto
de ajuda e regras de validação (mín/máx, expressão regular com mensagem própria,
intervalo de datas, nº de itens, extensões e tamanho máximo de ficheiro).

### Criar um serviço novo, do zero

1. **Serviços → Novo serviço**: nome e descrição breve. Nasce como rascunho.
2. **Adicionar campo**: escolher o tipo; o editor mostra apenas as regras que se
   aplicam a esse tipo.
3. Arrastar para reordenar.
4. **Publicar no site**: bloqueado enquanto não houver pelo menos um campo activo.
5. O serviço aparece de imediato em `/servicos/<slug>`, com o formulário a funcionar,
   incluído no `sitemap.xml` e com as meta tags definidas no separador *Conteúdo e SEO*.

Nenhum passo exige alterar código.

### Protecção dos dados já recolhidos

- A `key` de um campo já respondido **não pode** ser alterada (a API devolve 422).
- Apagar um campo já respondido **desactiva-o** em vez de o remover.
- Cada `RequestField` guarda `fieldKey`, `label` e `type` desnormalizados: um pedido
  de 2024 continua legível mesmo que o formulário tenha mudado desde então.

---

## Autenticação e permissões

### Fluxo de tokens

- **Access token**: JWT de 15 minutos, enviado em `Authorization: Bearer`.
- **Refresh token**: 7 dias, guardado em base de dados **apenas como hash SHA-256**.
- **Rotação**: cada renovação revoga o token usado e emite um par novo.
- Um `401` no backoffice dispara uma renovação automática e repete o pedido; o
  utilizador não é expulso a meio de uma tarefa.

Sessões são revogadas quando o utilizador é desactivado, muda de perfil, altera a
palavra-passe ou lhe é reposta.

### Perfis (hierárquicos)

| Perfil | Alcance |
|--------|---------|
| **Agente** | Ver e tratar pedidos, mudar estados, atribuir, notas internas, anexar |
| **Gestor** | Tudo do agente + criar/editar serviços e formulários, remover anexos |
| **Administrador** | Tudo + utilizadores, pipeline de estados, remoção de serviços, auditoria |

O RBAC é aplicado em três pontos: `RolesGuard` na API (autoridade), navegação do
backoffice (esconde o que não é acessível) e botões desactivados na interface.

---

## Base de dados

### Entidades

| Tabela | Descrição |
|--------|-----------|
| `roles` | Perfis com permissões granulares |
| `users` | Utilizadores do backoffice (remoção lógica) |
| `refresh_tokens` | Sessões activas, que permitem revogação |
| `services` | Catálogo de serviços |
| `form_fields` | **Definição dos campos por serviço** |
| `request_statuses` | Pipeline configurável (colunas do Kanban) |
| `requests` | Pedidos submetidos |
| `request_fields` | Valores submetidos (desnormalizados) |
| `attachments` | Ficheiros anexados |
| `request_history` | **Timeline: quem alterou o quê e quando** |
| `notes` | Notas internas |
| `audit_logs` | Auditoria transversal |
| `reference_counters` | Contador atómico das referências |

### Números de referência

Formato `AS-2026-000042`, gerados por `INSERT … ON CONFLICT DO UPDATE … RETURNING`
Isto é atómico, pelo que duas submissões simultâneas nunca recebem o mesmo número.

### Migrações

```bash
pnpm db:migrate                    # aplicar (cria uma nova em desenvolvimento)
pnpm db:seed                       # popular
pnpm db:reset                      # recriar do zero e popular
pnpm --filter @alson/api prisma:studio   # explorador visual
```

---

## Testes

```bash
pnpm test                                  # todos os testes da API
pnpm --filter @alson/api test:cov          # com cobertura
```

**84 testes** sobre os componentes críticos:

| Ficheiro | O que cobre |
|----------|-------------|
| `shared/form-schema.spec.ts` | Motor de validação: obrigatoriedade, todos os tipos, ficheiros, campos desactivados |
| `shared/utils.spec.ts` | Slugs, chaves de campo, referências, telefones |
| `catalog/…/form-field.entity.spec.ts` | Definição de campos: chaves, opções, coerência das regras |
| `requests/…/request.entity.spec.ts` | Transições de estado, fecho, notificação, atribuição |
| `requests/…/submit-request.use-case.spec.ts` | Submissão: validação no servidor, anti-spam, anexos, rollback |
| `iam/…/authenticate.use-case.spec.ts` | Login, contas inactivas, não-enumeração de contas |

---

## Comandos

| Comando | Efeito |
|---------|--------|
| `pnpm setup` | Instala, compila o pacote partilhado e gera o cliente Prisma |
| `pnpm dev` | Arranca API + site + backoffice |
| `pnpm dev:api` / `dev:web` / `dev:admin` | Um serviço de cada vez |
| `pnpm build` | Compila tudo pela ordem correcta |
| `pnpm test` | Testes unitários |
| `pnpm db:migrate` / `db:seed` / `db:reset` | Base de dados |
| `pnpm docker:up` / `docker:down` / `docker:logs` | Contentores |

> **Nota:** depois de alterar `packages/shared`, execute
> `pnpm --filter @alson/shared build`, porque a API consome a versão compilada.

---

## Variáveis de ambiente

Todas documentadas em [`.env.example`](.env.example). As críticas:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Ligação PostgreSQL |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | **Trocar em produção** (`openssl rand -base64 48`) |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | Validade dos tokens (`15m`, `7d`) |
| `CORS_ORIGINS` | Origens autorizadas, separadas por vírgula |
| `UPLOAD_MAX_FILE_SIZE` / `UPLOAD_ALLOWED_MIME` | Limites globais de upload |
| `MAIL_*` | SMTP e remetente |
| `MAIL_INTERNAL_RECIPIENT` | Caixa que recebe os avisos de novos pedidos |
| `THROTTLE_*` / `PUBLIC_SUBMIT_*` | Rate limiting |
| `ANTISPAM_MIN_FILL_TIME_MS` | Tempo mínimo de preenchimento (omissão 3000 ms) |
| `NUXT_PUBLIC_API_BASE` | API vista pelo browser |
| `NUXT_API_BASE_SERVER` | API vista pelo SSR (dentro do Docker: `http://api:3333/api`) |

O arranque falha imediatamente se faltar uma variável crítica ou se um segredo tiver
menos de 16 caracteres. Melhor falhar no arranque do que em produção.

---

## Segurança

- **Palavras-passe**: bcrypt com custo configurável; política de complexidade
  imposta pela API.
- **Não-enumeração de contas**: a comparação de hash corre mesmo sem utilizador, e a
  mensagem de erro é sempre a mesma.
- **Refresh tokens**: guardados como hash, com rotação e revogação.
- **Rate limiting**: global e por rota sensível (ver [docs/API.md](docs/API.md#9-rate-limiting)).
- **Anti-spam**: campo-armadilha invisível + tempo mínimo de preenchimento.
- **Uploads**: nome no disco desligado do original (evita path traversal), validação
  de mime type e tamanho, checksum SHA-256, caminho resolvido contra fuga da pasta.
- **Auditoria**: todas as alterações a entidades sensíveis, com autor, IP e diff.
- **Cabeçalhos**: Helmet na API; o backoffice envia `noindex, nofollow`.
- **Consulta pública**: exige referência **e** e-mail; a vista devolvida nunca
  inclui notas internas nem dados de terceiros.

---

## Acessibilidade

O site público segue **WCAG 2.1 nível AA**:

- Link *saltar para o conteúdo principal* (2.4.1).
- Marcação semântica: `header`/`nav`/`main`/`footer`, `fieldset`/`legend` nos grupos
  de campos, `dl` para pares etiqueta-valor.
- Todos os campos com `label` associado; erros ligados por `aria-describedby` e
  anunciados com `role="alert"` (3.3.1).
- Ao submeter com erros, o foco vai para o primeiro campo inválido.
- Foco sempre visível (2.4.7) e contraste ≥ 4.5:1. Os badges de estado calculam a
  luminância da cor escolhida no backoffice para decidir entre texto preto e branco.
- `prefers-reduced-motion` respeitado.
- Conteúdo integralmente em português (`lang="pt-AO"`).

---

## Produção

### Construir

```bash
pnpm build
```

Produz `apps/api/dist`, `apps/web/.output` e `apps/admin/.output`.

### Executar

```bash
# API (aplica as migrações antes de arrancar)
cd apps/api && pnpm start:prod

# Site institucional
node apps/web/.output/server/index.mjs

# Backoffice
node apps/admin/.output/server/index.mjs
```

O `Dockerfile` da API tem um estágio `production` multi-estágio pronto a usar.

### Lista de verificação

- [ ] Segredos JWT gerados de novo (`openssl rand -base64 48`)
- [ ] `CORS_ORIGINS` restrito aos domínios reais
- [ ] SMTP real configurado (o Mailpit é só para desenvolvimento)
- [ ] `NUXT_PUBLIC_SITE_URL` com o domínio final (afecta canonical, OG e sitemap)
- [ ] HTTPS com proxy inverso; `trust proxy` já está activo na API
- [ ] Backups do PostgreSQL e da pasta de uploads
- [ ] Palavra-passe dos utilizadores de demonstração alterada ou contas removidas

---

## Resolução de problemas

**`Environment variable not found: DATABASE_URL`**
Os comandos Prisma usam `dotenv-cli` para ler o `.env` da raiz. Confirme que o
ficheiro existe: `cp .env.example .env`.

**`Cannot find module '@alson/shared'`**
Compile o pacote partilhado: `pnpm --filter @alson/shared build`.

**O site não mostra os serviços**
Verifique se a API responde (`curl http://localhost:3333/api/health`) e se os
serviços estão publicados: no backoffice, a coluna *Estado* deve dizer *Publicado*.

**Os e-mails não chegam**
Em desenvolvimento vão todos para o Mailpit: http://localhost:8025. Falhas de envio
são registadas no log da API e nunca fazem falhar a operação de negócio.

**Porta ocupada**
Ajuste `API_PORT`, `WEB_PORT` ou `ADMIN_PORT` no `.env`.

---

## Documentação adicional

- [docs/API.md](docs/API.md): contrato completo, com endpoints, payloads e códigos de resposta
- [docs/ARQUITETURA.md](docs/ARQUITETURA.md): decisões de arquitectura e respectivas razões

---

© Alson Sombreiro Consultadoria, Lda
Sede: Rua Alexandre Herculano n.º 35, Benguela · Filiais: Luanda e Huambo
+244 923 075 864 · geral@alsonsombreiro.ao
