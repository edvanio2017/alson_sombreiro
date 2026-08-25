<script setup lang="ts">
const api = useApiFetch();

const form = reactive({ name: '', email: '', phone: '', subject: '', message: '' });
const consent = ref(false);
const honeypot = ref('');
const renderedAt = ref(Date.now());

const errors = ref<Record<string, string[]>>({});
const submitting = ref(false);
const sent = ref(false);
const generalError = ref('');

useSeo({
  title: 'Contacto',
  description:
    'Contacte a Alson Sombreiro Consultadoria. Escritórios em Benguela (sede), Luanda e Huambo. Telefone +244 923 075 864.',
  path: '/contacto',
});

function validate(): boolean {
  const found: Record<string, string[]> = {};
  if (form.name.trim().length < 3) found.name = ['Indique o seu nome.'];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
    found.email = ['Introduza um e-mail válido.'];
  }
  if (form.phone.trim() && !/^(\+?244)?[\s-]?9\d{2}[\s-]?\d{3}[\s-]?\d{3}$/.test(form.phone.trim())) {
    found.phone = ['Introduza um telefone válido (ex.: +244 923 075 864).'];
  }
  if (form.subject.trim().length < 3) found.subject = ['Indique o assunto.'];
  if (form.message.trim().length < 10) {
    found.message = ['A mensagem deve ter pelo menos 10 caracteres.'];
  }
  if (!consent.value) found.consent = ['É necessário autorizar o tratamento dos seus dados.'];

  errors.value = found;
  return Object.keys(found).length === 0;
}

async function submit(): Promise<void> {
  generalError.value = '';
  if (!validate()) return;

  submitting.value = true;
  try {
    await api('/public/contact', {
      method: 'POST',
      body: {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        consent: true,
        website: honeypot.value,
        renderedAt: renderedAt.value,
      },
    });
    sent.value = true;
  } catch (error) {
    const failure = toApiFailure(error);
    errors.value = failure.details;
    generalError.value = Object.keys(failure.details).length > 0 ? '' : failure.message;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div>
    <section class="border-b border-graphite-200 bg-white py-16 lg:py-20">
      <div class="container-page max-w-3xl">
        <p class="eyebrow">Fale connosco</p>
        <h1 class="display-title mt-4">Contacto</h1>
        <p class="prose-institucional mt-5">
          Para pedidos de serviço, prefira o formulário próprio de cada serviço, que garante que recebemos
          logo toda a informação necessária. Para tudo o resto, use o formulário abaixo.
        </p>
      </div>
    </section>

    <section class="py-14 lg:py-20">
      <div class="container-page grid gap-12 lg:grid-cols-12 lg:gap-16">
        <!-- Dados de contacto -->
        <div class="lg:col-span-5">
          <div class="space-y-9">
            <div v-for="office in COMPANY.offices" :key="office.city">
              <p class="eyebrow">{{ office.label }} · {{ office.city }}</p>
              <p class="mt-2 text-[15px] leading-relaxed text-graphite-700">{{ office.address }}</p>
            </div>

            <div class="hairline" />

            <div>
              <p class="eyebrow">Telefones</p>
              <ul class="mt-2 space-y-1">
                <li v-for="phone in COMPANY.phones" :key="phone">
                  <a
                    :href="`tel:${phone.replace(/\s/g, '')}`"
                    class="text-[16px] font-medium text-graphite-950 hover:underline"
                  >
                    {{ phone }}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p class="eyebrow">E-mail</p>
              <a
                :href="`mailto:${COMPANY.email}`"
                class="mt-2 block break-all text-[16px] font-medium text-graphite-950 hover:underline"
              >
                {{ COMPANY.email }}
              </a>
            </div>

            <div class="border-l-2 border-graphite-950 bg-white p-5">
              <p class="text-[13px] leading-relaxed text-graphite-600">
                Já submeteu um pedido? Consulte o estado do processo em
                <NuxtLink to="/acompanhar" class="text-graphite-950 underline">Acompanhar pedido</NuxtLink>.
              </p>
            </div>
          </div>
        </div>

        <!-- Formulário -->
        <div class="lg:col-span-7">
          <div v-if="sent" class="surface-card p-10 text-center">
            <div
              class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-graphite-950 text-white"
              aria-hidden="true"
            >
              <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 class="section-title mt-6">Mensagem enviada</h2>
            <p class="prose-institucional mt-3">
              Obrigado pelo seu contacto. A nossa equipa responderá com a maior brevidade.
            </p>
            <NuxtLink to="/servicos" class="btn-outline mt-8">Ver serviços</NuxtLink>
          </div>

          <form v-else class="surface-card p-6 sm:p-9" novalidate @submit.prevent="submit">
            <div class="grid gap-5 sm:grid-cols-2">
              <div>
                <label for="c-name" class="field-label">
                  Nome <span class="text-red-600" aria-hidden="true">*</span>
                </label>
                <input
                  id="c-name"
                  v-model="form.name"
                  type="text"
                  autocomplete="name"
                  :aria-invalid="!!errors.name"
                  :class="['field-control', errors.name && 'field-control-error']"
                />
                <p v-for="m in errors.name" :key="m" class="field-error" role="alert">{{ m }}</p>
              </div>

              <div>
                <label for="c-email" class="field-label">
                  E-mail <span class="text-red-600" aria-hidden="true">*</span>
                </label>
                <input
                  id="c-email"
                  v-model="form.email"
                  type="email"
                  autocomplete="email"
                  :aria-invalid="!!errors.email"
                  :class="['field-control', errors.email && 'field-control-error']"
                />
                <p v-for="m in errors.email" :key="m" class="field-error" role="alert">{{ m }}</p>
              </div>

              <div>
                <label for="c-phone" class="field-label">Telefone</label>
                <input
                  id="c-phone"
                  v-model="form.phone"
                  type="tel"
                  autocomplete="tel"
                  placeholder="+244 923 075 864"
                  :aria-invalid="!!errors.phone"
                  :class="['field-control', errors.phone && 'field-control-error']"
                />
                <p v-for="m in errors.phone" :key="m" class="field-error" role="alert">{{ m }}</p>
              </div>

              <div>
                <label for="c-subject" class="field-label">
                  Assunto <span class="text-red-600" aria-hidden="true">*</span>
                </label>
                <input
                  id="c-subject"
                  v-model="form.subject"
                  type="text"
                  :aria-invalid="!!errors.subject"
                  :class="['field-control', errors.subject && 'field-control-error']"
                />
                <p v-for="m in errors.subject" :key="m" class="field-error" role="alert">{{ m }}</p>
              </div>

              <div class="sm:col-span-2">
                <label for="c-message" class="field-label">
                  Mensagem <span class="text-red-600" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="c-message"
                  v-model="form.message"
                  rows="6"
                  :aria-invalid="!!errors.message"
                  :class="['field-control resize-y', errors.message && 'field-control-error']"
                />
                <p v-for="m in errors.message" :key="m" class="field-error" role="alert">{{ m }}</p>
              </div>
            </div>

            <!-- Campo-armadilha anti-spam -->
            <div aria-hidden="true" class="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label for="c-website">Não preencher</label>
              <input id="c-website" v-model="honeypot" type="text" tabindex="-1" autocomplete="off" />
            </div>

            <label
              for="c-consent"
              class="mt-6 flex cursor-pointer items-start gap-3 border p-4"
              :class="errors.consent ? 'border-red-400' : 'border-graphite-200'"
            >
              <input
                id="c-consent"
                v-model="consent"
                type="checkbox"
                class="mt-0.5 h-4 w-4 shrink-0 accent-graphite-950"
                :aria-invalid="!!errors.consent"
              />
              <span class="text-[14px] leading-relaxed text-graphite-600">
                Autorizo o tratamento dos meus dados para efeitos de resposta a este contacto, nos
                termos da
                <NuxtLink to="/privacidade" class="text-graphite-950 underline">Política de Privacidade</NuxtLink
                >. <span class="text-red-600" aria-hidden="true">*</span>
              </span>
            </label>
            <p v-for="m in errors.consent" :key="m" class="field-error" role="alert">{{ m }}</p>

            <p
              v-if="generalError"
              class="mt-5 border-l-2 border-red-500 bg-red-50 px-4 py-3 text-[14px] text-red-700"
              role="alert"
            >
              {{ generalError }}
            </p>

            <button type="submit" class="btn-primary mt-7 w-full sm:w-auto" :disabled="submitting">
              {{ submitting ? 'A enviar…' : 'Enviar mensagem' }}
            </button>
          </form>
        </div>
      </div>
    </section>
  </div>
</template>
