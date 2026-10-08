import { createClient } from "@supabase/supabase-js";

// Resumo e foto da Wikipédia para um marco. Só para páginas que estão
// cadastradas em algum marco (não é um proxy aberto) e com cache de 1 dia.
// O texto é CC BY-SA: a ficha sempre mostra a fonte e o link.
export const revalidate = 86400;

export async function GET(request: Request) {
  const title = new URL(request.url).searchParams.get("title") ?? "";
  if (!/^[\p{L}\p{N}_().,'-]{1,120}$/u.test(title)) return Response.json({ error: "título inválido" }, { status: 400 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  // artigo sobre o lugar (wiki_title) ou sobre quem ele homenageia (about_title)
  const { data } = await supabase
    .from("landmarks")
    .select("id")
    .or(`wiki_title.eq.${title},about_title.eq.${title}`)
    .limit(1);
  if (!data?.length) return Response.json({ error: "página não cadastrada" }, { status: 404 });

  const res = await fetch(`https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
    headers: { "User-Agent": "DeOlhoNaCidade/0.1 (https://github.com/; contato@viunacidade.com.br)" },
    next: { revalidate },
  });
  if (!res.ok) return Response.json({ error: "Wikipédia indisponível" }, { status: 502 });
  const w = (await res.json()) as {
    title: string;
    extract?: string;
    thumbnail?: { source: string };
    originalimage?: { source: string };
    content_urls?: { desktop?: { page?: string } };
  };
  return Response.json(
    {
      title: w.title,
      extract: w.extract ?? "",
      image: w.originalimage?.source ?? w.thumbnail?.source ?? null,
      url: w.content_urls?.desktop?.page ?? `https://pt.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
