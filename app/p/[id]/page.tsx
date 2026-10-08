import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, severityVar } from "@/lib/categories";
import { CITY } from "@/lib/city";
import { photoUrl } from "@/lib/media";
import { timeAgo, timeLeftShort } from "@/lib/posts";
import { getPublicPost } from "@/lib/server/publicPost";
import Mark from "@/components/ui/Mark";
import BetaTag from "@/components/ui/BetaTag";
import { CategoryIcon } from "@/components/ui/icons";
import RecordView from "./RecordView";

// A página que abre quando alguém toca no link compartilhado. Quem ainda não
// conhece o app vê a foto, entende em uma linha o que é e chega ao mapa.
export const dynamic = "force-dynamic";

const TZ = "America/Sao_Paulo";
const registered = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: TZ })
    .format(new Date(iso))
    .replace(",", " às");
const cityDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));

export async function generateMetadata({ params }: PageProps<"/p/[id]">): Promise<Metadata> {
  const { id } = await params;
  const post = await getPublicPost(id);
  if (!post) return { title: "Viu na Cidade" };
  const label = post.business_name ?? CATEGORIES[post.category].label;
  const title = post.alive
    ? `${label} em ${CITY.name}`
    : post.archived
      ? `${label} · histórico de ${CITY.name}`
      : `Registro que já sumiu · ${CITY.name}`;
  const description = post.alive
    ? `${post.caption ?? "Foto de agora no mapa da cidade."} Some em ${timeLeftShort(post.expires_at)}.`
    : post.archived
      ? `${post.caption ?? "Foto guardada no histórico da cidade."} Registrado em ${registered(post.created_at)}.`
      : "Os registros do Viu na Cidade somem em até 12 horas. Veja o que está rolando agora.";
  return { title, description, openGraph: { title, description, type: "article", locale: "pt_BR", siteName: "Viu na Cidade" } };
}

export default async function PostPage({ params }: PageProps<"/p/[id]">) {
  const { id } = await params;
  const post = await getPublicPost(id);
  const cat = post ? CATEGORIES[post.category] : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center gap-3 py-3">
        <Mark size={36} className="shrink-0" />
        <div>
          <p className="flex items-center gap-2 font-display text-base font-bold leading-tight">
            Viu na Cidade <BetaTag />
          </p>
          <p className="rotulo">
            {CITY.name} · {CITY.uf}
          </p>
        </div>
      </header>

      {(post?.alive || post?.archived) && post.photo_path && cat ? (
        <article className="mt-2 flex flex-col gap-4">
          {post.alive && <RecordView id={post.id} />}
          <div className="sala-escura relative overflow-hidden rounded-2xl border border-line bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(post.photo_path)} alt={post.caption ?? cat.label} className="max-h-[70dvh] w-full object-contain" />
            <span
              className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border bg-black/55 px-3 py-1.5 backdrop-blur"
              style={{ borderColor: severityVar(post.category), color: severityVar(post.category) }}
            >
              <CategoryIcon category={post.category} />
              <span className="rotulo" style={{ color: "inherit" }}>
                {post.business_name ?? cat.label}
              </span>
            </span>
          </div>
          {post.caption && <h1 className="font-display text-2xl font-semibold leading-snug">{post.caption}</h1>}
          <p className="rotulo flex flex-wrap gap-x-3 gap-y-1">
            {post.alive ? (
              <>
                <span>{timeAgo(post.created_at)}</span>
                <span>
                  some em <span className="num text-ink">{timeLeftShort(post.expires_at)}</span>
                </span>
              </>
            ) : (
              <span>
                do histórico da cidade · registrado em <span className="num text-ink">{registered(post.created_at)}</span>
              </span>
            )}
            {post.confirm_count > 0 && <span>{post.confirm_count} confirmaram</span>}
          </p>
          <Link
            href={post.alive ? `/mapa?post=${post.id}` : `/mapa?historico=${cityDay(post.created_at)}&post=${post.id}`}
            className="mt-2 inline-flex items-center justify-center rounded-lg bg-accent px-5 py-3 text-base font-semibold text-accent-ink"
          >
            {post.alive ? "Ver no mapa" : "Ver no histórico"}
          </Link>
        </article>
      ) : (
        <section className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface px-6 py-8 text-center">
          <p className="font-display text-xl font-semibold">{post ? "Esse registro já sumiu" : "Registro não encontrado"}</p>
          <p className="text-sm text-muted">
            No Viu na Cidade, cada foto mostra o que está acontecendo agora e some do mapa em até 12 horas.
          </p>
          <Link href="/mapa" className="mt-2 rounded-lg bg-accent px-5 py-3 text-base font-semibold text-accent-ink">
            Ver o que está rolando agora
          </Link>
        </section>
      )}

      <p className="mt-auto pt-10 text-center text-xs text-muted">
        Fotos anônimas de quem está em {CITY.name}, direto no mapa da cidade.
      </p>
    </main>
  );
}
