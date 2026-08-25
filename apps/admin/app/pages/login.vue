<script setup lang="ts">
definePageMeta({ layout: 'auth' });
useHead({ title: 'Entrar' });

const auth = useAuth();
const route = useRoute();
const toast = useToast();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const submitting = ref(false);
const errorMessage = ref('');

async function submit(): Promise<void> {
  errorMessage.value = '';

  if (!email.value.trim() || !password.value) {
    errorMessage.value = 'Preencha o e-mail e a palavra-passe.';
    return;
  }

  submitting.value = true;
  try {
    await auth.login(email.value.trim(), password.value);
    toast.success(`Bem-vindo, ${auth.user.value?.name}.`);
    // Regressa ao destino que originou o redireccionamento para o login.
    await navigateTo(String(route.query.destino ?? '/'));
  } catch (error) {
    errorMessage.value = toApiFailure(error).message;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div>
    <img src="/logos/logo-dark.png" alt="Alson Sombreiro" class="mb-10 h-9 w-auto lg:hidden" />

    <h1 class="text-2xl font-semibold tracking-tight text-graphite-950">Backoffice</h1>
    <p class="mt-2 text-[14px] text-graphite-500">
      Introduza as suas credenciais para aceder à gestão de pedidos.
    </p>

    <form class="mt-8 space-y-4" novalidate @submit.prevent="submit">
      <div>
        <label for="email" class="label">E-mail</label>
        <input
          id="email"
          v-model="email"
          type="email"
          autocomplete="username"
          autofocus
          class="input"
          placeholder="nome@alsonsombreiro.ao"
        />
      </div>

      <div>
        <label for="password" class="label">Palavra-passe</label>
        <div class="relative">
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            class="input pr-10"
          />
          <button
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-graphite-400 transition-colors hover:text-graphite-700"
            :aria-label="showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'"
            @click="showPassword = !showPassword"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path
                v-if="!showPassword"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
              />
              <path v-if="!showPassword" stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path
                v-else
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.774 3.162 10.066 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243"
              />
            </svg>
          </button>
        </div>
      </div>

      <p
        v-if="errorMessage"
        class="rounded-sm border-l-2 border-red-500 bg-red-50 px-3 py-2.5 text-[13px] text-red-700"
        role="alert"
      >
        {{ errorMessage }}
      </p>

      <button type="submit" class="btn-primary w-full py-2.5" :disabled="submitting">
        <svg v-if="submitting" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
          <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4Z" />
        </svg>
        {{ submitting ? 'A entrar…' : 'Entrar' }}
      </button>
    </form>

    <p class="mt-8 text-[12px] leading-relaxed text-graphite-400">
      Esqueceu-se da palavra-passe? Contacte o administrador do sistema para que lhe seja atribuída
      uma nova.
    </p>
  </div>
</template>
