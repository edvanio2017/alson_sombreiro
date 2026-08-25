# Decisões de arquitectura

Este documento explica **porquê**, ou seja, as razões por trás das escolhas estruturais do
sistema. O *como* está no [README](../README.md) e o contrato da API em [API.md](API.md).

---

## 1. Um schema de validação, dois consumidores

**Problema.** Os formulários são definidos no backoffice, não no código. A validação
tem de correr no browser (resposta imediata) e no servidor (autoridade). A tentação
óbvia, escrever as regras duas vezes, garante que mais cedo ou mais tarde divergem,
e a divergência entre validação de cliente e de servidor é uma falha de segurança.

**Decisão.** O pacote `@alson/shared` contém uma função que converte a definição dos
campos num schema Zod:

```ts
buildFormSchema(fields: FormFieldDto[]) → ZodObject
validateFormData(fields, data) → { success, data, errors }
```

O `DynamicForm.vue` chama-a antes de submeter. O `SubmitRequestUseCase` chama-a
outra vez, sobre os dados recebidos. Mesmo código, mesmas mensagens, mesmas regras.

**Consequência.** Adicionar um tipo de campo novo é editar um ficheiro
(`form-schema.ts`) e acrescentar um ramo ao `DynamicField.vue`. Não há uma terceira
cópia das regras à espera de ficar desactualizada.

**Alternativas consideradas.** JSON Schema com AJV nos dois lados, mais verboso e
com pior inferência de tipos em TypeScript. Validar só no servidor obrigaria a uma
ida à rede por cada erro de preenchimento.

---

## 2. Clean Architecture com quatro camadas

**Problema.** As regras de negócio deste sistema não são triviais: transições de
pipeline, invariantes do construtor de formulários, protecção de dados já recolhidos.
Espalhadas por controladores e chamadas Prisma, seriam impossíveis de testar sem
base de dados e de encontrar quando mudassem.

**Decisão.** Cada módulo tem `domain/`, `application/`, `infrastructure/` e
`presentation/`, com as dependências sempre a apontar para dentro.

O domínio não conhece HTTP nem Prisma. `Request.transitionTo(status)` valida a
transição e devolve `{ from, to }`, testável em memória, sem infraestrutura:

```ts
it('recusa a transição para o estado actual', () => {
  const request = Request.create('r1', props());
  expect(() => request.transitionTo(status())).toThrow(BusinessRuleError);
});
```

**Consequência.** 84 testes correm em ~4 segundos, sem contentores. A tradução de
erros de domínio para códigos HTTP acontece num único ficheiro
(`DomainExceptionFilter`).

**Custo assumido.** Mais ficheiros e uma camada de mapeamento entre registos de
persistência e entidades de domínio. Justifica-se pela densidade de regras; num CRUD
simples seria excesso.

---

## 3. Portas e adaptadores para o que é externo

Armazenamento de ficheiros, envio de e-mail, hashing e emissão de tokens entram no
sistema por interfaces declaradas na camada de aplicação:

```ts
export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
export interface StoragePort {
  save(file: FileToStore, folder: string): Promise<StoredFile>;
  read(path: string): Promise<Buffer>;
  remove(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}
```

A ligação ao adaptador concreto vive só no módulo Nest. Migrar de disco local para
S3 é escrever `S3StorageService implements StoragePort` e mudar uma linha; nenhum
caso de uso muda.

---

## 4. Referências geradas atomicamente

**Problema.** `AS-2026-000042` é o identificador que o cliente guarda e cita ao
telefone. Duas submissões simultâneas não podem receber o mesmo número, e ler o
máximo actual para somar um é uma condição de corrida clássica.

**Decisão.** Uma tabela `reference_counters` e uma única instrução SQL:

```sql
INSERT INTO reference_counters (year, sequence, updated_at)
VALUES ($1, 1, NOW())
ON CONFLICT (year)
DO UPDATE SET sequence = reference_counters.sequence + 1, updated_at = NOW()
RETURNING sequence;
```

O PostgreSQL garante a atomicidade. Sem bloqueios explícitos, sem transação
adicional, sem colisões.

**Alternativa rejeitada.** UUID como referência pública, impossível de ditar ao
telefone e sem a informação de ano que facilita o arquivo.

---

## 5. Dados dos pedidos desnormalizados de propósito

`RequestField` guarda `fieldKey`, `label`, `type` **e** `displayValue`, além da
referência opcional ao `FormField`.

É redundância deliberada. Um pedido submetido em 2024 tem de continuar legível em
2027, mesmo que o campo tenha sido renomeado, mudado de tipo ou removido do serviço.
Sem isto, mexer num formulário reescreveria retroactivamente o histórico.

Regras que decorrem daí:

- alterar a `key` de um campo já respondido → **422**;
- apagar um campo já respondido → **desactiva** em vez de remover;
- `fieldId` tem `onDelete: SetNull`, pelo que o valor sobrevive ao campo.

---

## 6. Pipeline livre, não uma máquina de estados rígida

Os estados são configuráveis no backoffice, o que exclui à partida um grafo de
transições fixo no código. Mas mesmo com estados fixos a escolha seria a mesma: a
operação real precisa de recuar um pedido de *Proposta enviada* para *Em análise*
porque o cliente pediu uma alteração.

As únicas regras mantidas são as que protegem a integridade:

- o estado de destino tem de estar activo;
- tem de ser diferente do actual;
- existe sempre exactamente um estado inicial;
- o estado inicial não pode ser desactivado nem removido;
- um estado com pedidos não pode ser removido.

A rastreabilidade é garantida pela timeline, não por restringir movimentos.

---

## 7. SSR no site, SPA no backoffice

**Site institucional, em SSR.** É a montra pública da empresa: precisa de indexação,
de meta tags e Open Graph renderizados no servidor, e de primeira pintura rápida em
ligações móveis angolanas. As páginas de serviço são geradas a partir da API com
`swr: 300`, porque o catálogo muda pouco e a revalidação corre em segundo plano.

**Backoffice, em SPA.** Privado, atrás de autenticação, com `noindex`. Não há nada a
indexar e o SSR só complicaria a gestão dos tokens. A aplicação carrega uma vez e as
navegações seguintes são instantâneas.

---

## 8. Tokens no `localStorage`, e porquê

A opção mais segura seria um cookie `HttpOnly` + `SameSite`, imune a XSS. Exige, no
entanto, que a API e o backoffice partilhem domínio ou que se configure CORS com
credenciais e um domínio-pai comum, o que não se pode assumir sobre o alojamento
final.

A decisão foi `localStorage` com mitigações concretas:

- access token de vida curta (15 min);
- refresh token com **rotação**: reutilizar um token consumido invalida a sessão;
- revogação imediata ao desactivar, mudar de perfil ou alterar a palavra-passe;
- revalidação do utilizador em base de dados a **cada pedido** (`JwtStrategy`), pelo
  que uma conta desactivada perde acesso sem esperar pela expiração do token;
- backoffice sem conteúdo gerado por utilizadores externos, o que reduz muito a
  superfície de XSS.

Se o alojamento vier a garantir domínio comum, a migração para cookies é local:
`useAuth.ts` no cliente e a emissão na API.

---

## 9. Anti-spam sem CAPTCHA

O formulário público é um alvo óbvio. A escolha foi não usar CAPTCHA: prejudica a
acessibilidade, depende de um serviço externo e cria atrito num formulário que já é
longo.

Três camadas, todas invisíveis para quem preenche de boa-fé:

1. **Campo-armadilha**: `website`, escondido fora do ecrã, `tabindex="-1"`,
   `aria-hidden`. Nenhuma pessoa o preenche; muitos bots preenchem.
2. **Tempo mínimo de preenchimento**: o formulário regista quando foi apresentado;
   submissões abaixo de 3 s são recusadas.
3. **Rate limiting por IP**: 5 submissões por hora.

Tentativas bloqueadas são registadas no log com o IP de origem. Se o volume de spam
o justificar, acrescentar um desafio é uma camada adicional, não uma substituição.

---

## 10. Auditoria que nunca faz falhar o negócio

`AuditService.record()` captura os seus próprios erros e limita-se a registá-los no
log da aplicação. A razão é simples: um problema a escrever auditoria não pode
impedir que o pedido de um cliente seja registado.

O mesmo princípio aplica-se ao envio de e-mail: `NodemailerService.send()` nunca
propaga a falha. Um e-mail que não sai é um incidente; um pedido que se perde é
outro tipo de problema.

Duas trilhas distintas, por terem públicos distintos:

- **`RequestHistory`**: timeline visível ao utilizador do backoffice e, filtrada, ao
  requerente. Descrições em português, legíveis.
- **`AuditLog`**: registo técnico transversal, com diff campo a campo, IP e user
  agent. Só de leitura, e só para administradores.

---

## 11. Remoção lógica onde o histórico importa

`User`, `Service`, `Attachment` e `Note` usam `deletedAt` em vez de remoção física.

Um pedido de 2024 atribuído a alguém que já saiu da empresa tem de continuar a
mostrar quem o tratou. Apagar o utilizador destruiria o histórico ou obrigaria a
`ON DELETE CASCADE` em cadeia.

Ao remover um utilizador, o e-mail é libertado (`removido+<id>@…`) para poder ser
reutilizado, mas o registo mantém-se.

---

## 12. Português europeu, em todo o lado

Nomes de variáveis e de ficheiros em inglês (convenção da comunidade); **todo** o
resto em português europeu: comentários, mensagens de erro, documentação, interface.

O sistema é operado por uma equipa angolana e as mensagens de erro chegam ao cliente
final. Uma mensagem em inglês numa página pública seria um defeito de produto, e
comentários numa língua diferente da equipa que mantém o código são atrito
desnecessário.

Usa-se a grafia pré-acordo em vocabulário técnico corrente na prática empresarial
angolana (*actualizar*, *acção*, *objectivo*), coerente com os documentos
institucionais da empresa.
