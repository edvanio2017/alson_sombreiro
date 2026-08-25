/**
 * Limites de rate limiting usados pelos decoradores `@Throttle`.
 *
 * Os decoradores são avaliados quando a classe é definida, antes de o
 * `ConfigService` existir, por isso estes valores são lidos aqui, uma única
 * vez, no arranque do processo. É a única excepção à regra de que só
 * `configuration.ts` toca em `process.env`, e existe para que as variáveis
 * `PUBLIC_SUBMIT_*` documentadas no `.env` tenham efeito real.
 */
const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

/** Submissão pública de pedidos e envio de mensagens de contacto. */
export const PUBLIC_SUBMIT_THROTTLE = {
  limit: toInt(process.env.PUBLIC_SUBMIT_LIMIT, 5),
  ttl: toInt(process.env.PUBLIC_SUBMIT_TTL, 3600) * 1000,
};

/** Tentativas de início de sessão. */
export const LOGIN_THROTTLE = {
  limit: toInt(process.env.LOGIN_THROTTLE_LIMIT, 10),
  ttl: toInt(process.env.LOGIN_THROTTLE_TTL, 60) * 1000,
};

/** Renovação de sessão. */
export const REFRESH_THROTTLE = {
  limit: toInt(process.env.REFRESH_THROTTLE_LIMIT, 30),
  ttl: toInt(process.env.REFRESH_THROTTLE_TTL, 60) * 1000,
};

/** Consulta pública do estado de um pedido. */
export const TRACK_THROTTLE = {
  limit: toInt(process.env.TRACK_THROTTLE_LIMIT, 20),
  ttl: toInt(process.env.TRACK_THROTTLE_TTL, 60) * 1000,
};
