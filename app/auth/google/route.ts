import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Login com Google na mesma guia, sem passar pelo endereço do Supabase.
// GET leva ao Google; o Google devolve o ID token por POST (form_post) neste
// mesmo endereço, que precisa estar em "URIs de redirecionamento
// autorizados" no cliente OAuth. O Supabase confere o token e a sessão sai
// daqui em cookies, que o cliente do navegador já lê.
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const COOKIE = "g_oauth";

function random() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
}

async function sha256Hex(s: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Buffer.from(hash).toString("hex");
}

function back(request: Request, ok: boolean) {
  const url = new URL("/mapa", request.url);
  if (!ok) url.searchParams.set("login", "erro");
  // 303: o navegador troca o POST do Google por um GET
  return NextResponse.redirect(url, 303);
}

export async function GET(request: Request) {
  if (!CLIENT_ID) return back(request, false);
  const state = random();
  const nonce = random();
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.search = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: new URL("/auth/google", request.url).toString(),
    response_type: "id_token",
    response_mode: "form_post",
    scope: "openid email profile",
    prompt: "select_account",
    state,
    // O Google recebe o hash; o Supabase recebe o nonce puro e confere
    nonce: await sha256Hex(nonce),
  }).toString();
  const res = NextResponse.redirect(auth);
  // SameSite=None: a volta é um POST vindo de accounts.google.com
  res.cookies.set(COOKIE, `${state}.${nonce}`, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/auth/google",
    maxAge: 600,
  });
  return res;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const token = form.get("id_token");
  const [state, nonce] = (request.headers.get("cookie") ?? "")
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1)
    .split(".") ?? [];
  if (typeof token !== "string" || !state || !nonce || form.get("state") !== state) return back(request, false);

  const res = back(request, true);
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => [],
      setAll: (list) => list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
    },
  });
  const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token, nonce });
  if (error) {
    console.error("auth/google", error.message);
    return back(request, false);
  }
  res.cookies.delete({ name: COOKIE, path: "/auth/google" });
  return res;
}
