// O supabase-js às vezes devolve o erro como objeto simples ({ message, code }),
// não como Error: sem isto, a mensagem do banco ("Você não pode confirmar o
// próprio post") virava um "não foi possível" genérico.
export function errorMessage(e: unknown, fallback: string) {
  if (e instanceof Error && e.message) return e.message;
  if (e && typeof e === "object" && "message" in e && typeof e.message === "string" && e.message) return e.message;
  return fallback;
}
