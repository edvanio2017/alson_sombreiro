<script setup lang="ts">
import { ROLES, ROLE_LABELS, formatDate, type PaginatedResult, type RoleName, type UserSummaryDto } from '@alson/shared';

useHead({ title: 'Utilizadores' });

type UserRow = UserSummaryDto & { phone: string | null; lastLoginAt: string | null };

const api = useApi();
const auth = useAuth();
const toast = useToast();

const items = ref<UserRow[]>([]);
const loading = ref(true);
const search = ref('');

const showEditor = ref(false);
const editing = ref<UserRow | null>(null);
const saving = ref(false);
const errors = ref<Record<string, string[]>>({});

const form = reactive({
  name: '',
  email: '',
  phone: '',
  role: 'AGENTE' as RoleName,
  password: '',
  sendInvite: true,
  active: true,
});

async function load(): Promise<void> {
  loading.value = true;
  try {
    const result = await api.get<PaginatedResult<UserRow>>('/users', {
      perPage: 100,
      ...(search.value ? { search: search.value } : {}),
    });
    items.value = result.items;
  } finally {
    loading.value = false;
  }
}

function openNew(): void {
  editing.value = null;
  errors.value = {};
  Object.assign(form, { name: '', email: '', phone: '', role: 'AGENTE', password: '', sendInvite: true, active: true });
  showEditor.value = true;
}

function openEdit(user: UserRow): void {
  editing.value = user;
  errors.value = {};
  Object.assign(form, {
    name: user.name,
    email: user.email,
    phone: user.phone ?? '',
    role: user.role,
    password: '',
    sendInvite: false,
    active: user.active,
  });
  showEditor.value = true;
}

async function save(): Promise<void> {
  saving.value = true;
  errors.value = {};
  try {
    if (editing.value) {
      await api.patch(`/users/${editing.value.id}`, {
        name: form.name,
        email: form.email,
        phone: form.phone.trim() || null,
        role: form.role,
        active: form.active,
      });
      toast.success('Utilizador actualizado.');
    } else {
      await api.post('/users', {
        name: form.name,
        email: form.email,
        phone: form.phone.trim() || null,
        role: form.role,
        ...(form.password ? { password: form.password } : {}),
        sendInvite: form.sendInvite,
      });
      toast.success(
        form.sendInvite
          ? 'Utilizador criado. As credenciais foram enviadas por e-mail.'
          : 'Utilizador criado.',
      );
    }
    showEditor.value = false;
    await load();
  } catch (error) {
    const failure = toApiFailure(error);
    errors.value = failure.details;
    if (!Object.keys(failure.details).length) toast.error(failure.message);
  } finally {
    saving.value = false;
  }
}

async function resetPassword(user: UserRow): Promise<void> {
  if (!confirm(`Repor a palavra-passe de ${user.name}? Será gerada uma nova e enviada por e-mail, e as sessões abertas terminam.`)) return;
  try {
    await api.post(`/users/${user.id}/reset-password`);
    toast.success('Nova palavra-passe enviada por e-mail.');
  } catch (error) {
    toast.error(toApiFailure(error).message);
  }
}

async function remove(user: UserRow): Promise<void> {
  if (!confirm(`Remover o utilizador ${user.name}? O histórico dos pedidos é preservado.`)) return;
  try {
    await api.delete(`/users/${user.id}`);
    toast.success('Utilizador removido.');
    await load();
  } catch (error) {
    toast.error(toApiFailure(error).message);
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(timer);
  timer = setTimeout(load, 300);
});

onMounted(load);

/** Descrição de cada perfil, para que a atribuição não seja feita às cegas. */
const roleDescription: Record<RoleName, string> = {
  ADMIN: 'Acesso total, incluindo utilizadores, pipeline e auditoria.',
  GESTOR: 'Gere serviços, formulários e todo o ciclo de vida dos pedidos.',
  AGENTE: 'Trata pedidos e regista notas internas. Sem acesso à configuração.',
};
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-graphite-950">Utilizadores</h1>
        <p class="mt-1 text-[13px] text-graphite-500">
          Contas de acesso ao backoffice e respectivos perfis de permissões.
        </p>
      </div>
      <button type="button" class="btn-primary" @click="openNew">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Novo utilizador
      </button>
    </div>

    <div class="mt-6 max-w-sm">
      <label for="u-search" class="sr-only">Pesquisar utilizadores</label>
      <input id="u-search" v-model="search" type="search" class="input" placeholder="Pesquisar por nome ou e-mail…" />
    </div>

    <section class="panel mt-4 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px]">
          <thead>
            <tr>
              <th class="table-head">Utilizador</th>
              <th class="table-head">Perfil</th>
              <th class="table-head">Último acesso</th>
              <th class="table-head">Estado</th>
              <th class="table-head"><span class="sr-only">Acções</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="px-4 py-12 text-center text-[13px] text-graphite-400">A carregar…</td>
            </tr>

            <tr v-for="user in items" v-else :key="user.id" class="hover:bg-graphite-50">
              <td class="table-cell">
                <div class="flex items-center gap-3">
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-graphite-950 text-[11px] font-semibold text-white" aria-hidden="true">
                    {{ user.name.slice(0, 2).toUpperCase() }}
                  </span>
                  <div class="min-w-0">
                    <p class="font-medium text-graphite-900">
                      {{ user.name }}
                      <span v-if="user.id === auth.user.value?.id" class="ml-1 text-[11px] font-normal text-graphite-400">(você)</span>
                    </p>
                    <p class="truncate text-[12px] text-graphite-400">{{ user.email }}</p>
                  </div>
                </div>
              </td>

              <td class="table-cell">
                <span class="badge bg-graphite-100 text-graphite-700">{{ ROLE_LABELS[user.role] }}</span>
              </td>

              <td class="table-cell">
                <span v-if="user.lastLoginAt">{{ formatDate(user.lastLoginAt, true) }}</span>
                <span v-else class="text-graphite-300">nunca</span>
              </td>

              <td class="table-cell">
                <span class="badge" :class="user.active ? 'bg-emerald-100 text-emerald-700' : 'bg-graphite-100 text-graphite-500'">
                  {{ user.active ? 'Activo' : 'Desactivado' }}
                </span>
              </td>

              <td class="table-cell">
                <div class="flex justify-end gap-1.5">
                  <button type="button" class="btn-secondary btn-xs" @click="openEdit(user)">Editar</button>
                  <button type="button" class="btn-secondary btn-xs" @click="resetPassword(user)">Repor palavra-passe</button>
                  <button
                    type="button"
                    class="btn-danger btn-xs"
                    :disabled="user.id === auth.user.value?.id"
                    :title="user.id === auth.user.value?.id ? 'Não pode remover a sua própria conta.' : undefined"
                    @click="remove(user)"
                  >
                    Remover
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="!loading && !items.length">
              <td colspan="5" class="px-4 py-16 text-center text-[13px] text-graphite-400">
                Nenhum utilizador encontrado.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <ModalDialog v-model="showEditor" :title="editing ? `Editar utilizador: ${editing.name}` : 'Novo utilizador'">
      <form class="space-y-4" novalidate @submit.prevent="save">
        <div>
          <label for="u-name" class="label">Nome completo</label>
          <input id="u-name" v-model="form.name" type="text" class="input" :class="errors.name && 'input-error'" />
          <p v-for="m in errors.name" :key="m" class="field-error">{{ m }}</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="u-email" class="label">E-mail</label>
            <input id="u-email" v-model="form.email" type="email" class="input" :class="errors.email && 'input-error'" />
            <p v-for="m in errors.email" :key="m" class="field-error">{{ m }}</p>
          </div>
          <div>
            <label for="u-phone" class="label">Telefone</label>
            <input id="u-phone" v-model="form.phone" type="tel" class="input" placeholder="+244 923 075 864" />
          </div>
        </div>

        <div>
          <label for="u-role" class="label">Perfil de acesso</label>
          <select id="u-role" v-model="form.role" class="input">
            <option v-for="role in ROLES" :key="role" :value="role">{{ ROLE_LABELS[role] }}</option>
          </select>
          <p class="mt-1.5 text-[11px] leading-relaxed text-graphite-400">{{ roleDescription[form.role] }}</p>
          <p v-for="m in errors.role" :key="m" class="field-error">{{ m }}</p>
        </div>

        <template v-if="!editing">
          <div>
            <label for="u-pass" class="label">Palavra-passe inicial (opcional)</label>
            <input id="u-pass" v-model="form.password" type="text" class="input" :class="errors.password && 'input-error'" placeholder="Deixe vazio para gerar automaticamente" />
            <p class="mt-1 text-[11px] text-graphite-400">
              Mínimo 8 caracteres, com maiúscula, minúscula e algarismo.
            </p>
            <p v-for="m in errors.password" :key="m" class="field-error">{{ m }}</p>
          </div>

          <label class="flex cursor-pointer items-center gap-2 text-[13px] text-graphite-700">
            <input v-model="form.sendInvite" type="checkbox" class="h-3.5 w-3.5 accent-graphite-950" />
            Enviar credenciais por e-mail
          </label>
        </template>

        <label v-else class="flex cursor-pointer items-center gap-2 text-[13px] text-graphite-700">
          <input v-model="form.active" type="checkbox" class="h-3.5 w-3.5 accent-graphite-950" />
          Conta activa
        </label>

        <div class="flex justify-end gap-2 pt-1">
          <button type="button" class="btn-secondary" @click="showEditor = false">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="saving">
            {{ saving ? 'A guardar…' : 'Guardar' }}
          </button>
        </div>
      </form>
    </ModalDialog>
  </div>
</template>
