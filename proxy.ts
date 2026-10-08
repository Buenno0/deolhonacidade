import { NextResponse, type NextRequest } from "next/server";

// A raiz é a LP. Vai direto ao mapa:
// - link antigo (/?post=, /?pedido=, /?historico=) já compartilhado no WhatsApp ou num alerta;
// - quem já entrou (cookie de sessão do Supabase): essa pessoa quer o mapa, não a apresentação.
//   /?lp mostra a LP mesmo logado.
const DEEP_LINK = ["post", "pedido", "historico", "comercio"];

export function proxy(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const deepLink = DEEP_LINK.some((k) => searchParams.has(k));
  const loggedIn = request.cookies.getAll().some((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name));
  if (searchParams.has("lp") || (!deepLink && !loggedIn)) return;
  const url = request.nextUrl.clone();
  url.pathname = "/mapa";
  return NextResponse.redirect(url);
}

export const config = { matcher: "/" };
