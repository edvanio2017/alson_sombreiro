<script setup lang="ts">
import { ROLE_LABELS } from '@alson/shared';

useHead({ title: 'O meu perfil' });

const api = useApi();
const auth = useAuth();
const toast = useToast();

const form = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' });
const saving = ref(false);
const errors = ref<Record<string, string[]>>({});

async function changePassword(): Promise<void> {
  saving.value = true;
  errors.value = {};
  try {
    await api.post('/auth/change-password', { ...form });
    toast.success('Palavra-passe alterada. Terá de iniciar sessão novamente.');
    // Alterar a palavra-passe revoga todas as sessões, incluindo esta.
    setTimeout(() => auth.logout(), 1500);
  } catch (error) {
    const failure = toApiFailure(error);
    errors.value = failure.details;
    if (!Object.keys(failure.details).length) toast.error(failure.message);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <h1 class="text-xl font-semibold tracking-tight text-graphite-950">O meu perfil</h1>

    <section class="panel mt-6">
      <div class="panel-header"><h2 class="panel-title">Dados da conta</h2></div>
      <dl class="grid gap-4 p-5 sm:grid-cols-3">
        <div>
          <dt class="text-[11px] uppercase tracking-wider text-graphite-400">Nome</dt>
          <dd class="mt-1 text-[14px] text-graphite-900">{{ auth.user.value?.name }}</dd>
        </div>
        <div>
          <dt class="text-[11px] uppercase tracking-wider text-graphite-400">E-mail</dt>
          <dd class="mt-1 truncate text-[14px] text-graphite-900">{{ auth.user.value?.email }}</dd>
        </div>
        <div>
          <dt class="text-[11px] uppercase tracking-wider text-graphite-400">Perfil</dt>
          <dd class="mt-1 text-[14px] text-graphite-900">
            {{ auth.user.value ? ROLE_LABELS[auth.user.value.role] : 'sem perfil' }}
          </dd>
        </div>
      </dl>
      <p class="border-t border-graphite-100 px-5 py-3 text-[12px] text-graphite-400">
        Para alterar o nome, o e-mail ou o perfil, contacte um administrador.
      </p>
    </section>

    <section class="panel mt-6">
      <div class="panel-header"><h2 class="panel-title">Alterar palavra-passe</h2></div>

      <form class="space-y-4 p-5" novalidate @submit.prevent="changePassword">
        <div>
          <label for="pw-current" class="label">Palavra-passe actual</label>
          <input
            id="pw-current"
            v-model="form.currentPassword"
            type="password"
            autocomplete="current-password"
            class="input"
            :class="errors.currentPassword && 'input-error'"
          />
          <p v-for="m in errors.currentPassword" :key="m" class="field-error">{{ m }}</p>
        </div>

        <div>
          <label for="pw-new" class="label">Nova palavra-passe</label>
          <input
            id="pw-new"
            v-model="form.newPassword"
            type="password"
            autocomplete="new-password"
            class="input"
            :class="errors.newPassword && 'input-error'"
          />
          <p class="mt-1 text-[11px] text-graphite-400">
            Mínimo 8 caracteres, com pelo menos uma maiúscula, uma minúscula e um algarismo.
          </p>
          <p v-for="m in errors.newPassword" :key="m" class="field-error">{{ m }}</p>
        </div>

        <div>
          <label for="pw-confirm" class="label">Confirmar nova palavra-passe</label>
          <input
            id="pw-confirm"
            v-model="form.confirmPassword"
            type="password"
            autocomplete="new-password"
            class="input"
            :class="errors.confirmPassword && 'input-error'"
          />
          <p v-for="m in errors.confirmPassword" :key="m" class="field-error">{{ m }}</p>
        </div>

        <p class="rounded-sm bg-graphite-50 px-3 py-2.5 text-[12px] leading-relaxed text-graphite-500">
          Por segurança, alterar a palavra-passe termina todas as sessões abertas, incluindo esta.
        </p>

        <div class="flex justify-end">
          <button type="submit" class="btn-primary" :disabled="saving">
            {{ saving ? 'A alterar…' : 'Alterar palavra-passe' }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>
