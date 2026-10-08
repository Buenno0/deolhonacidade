import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import Mark from "@/components/ui/Mark";
import LiveMap from "@/components/landing/LiveMap";
import PauseButton from "@/components/landing/PauseButton";
import Reveal from "@/components/landing/Reveal";
import StoryDemo from "@/components/landing/StoryDemo";
import FadingPost from "@/components/landing/FadingPost";
import DaySection from "@/components/landing/DaySection";
import FirstInNeighborhood from "@/components/landing/FirstInNeighborhood";
import AdSimulator from "@/components/landing/AdSimulator";
import LazyScene from "@/components/landing/LazyScene";
import AchievementShowcase from "@/components/landing/AchievementShowcase";
import { levelName } from "@/lib/progress";
import { CITY } from "@/lib/city";
import "./landing.css";

// A LP. Quem já entrou ou vem de um link antigo (/?post=…) é mandado ao mapa
// pelo proxy.ts; o app instalado abre em /mapa pelo manifest.

const TITLE = `Viu na Cidade · o que está acontecendo em ${CITY.name} agora`;
const DESCRIPTION = `Trânsito, alagamento, acidente, evento: fotos de agora no mapa de ${CITY.name}/${CITY.uf}, postadas por quem está lá. Anônimo, grátis, e cada foto some em até 12 horas.`;

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  keywords: [CITY.name, `trânsito ${CITY.name}`, `notícias ${CITY.name}`, "mapa ao vivo", "alagamento", "acidente agora"],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "Viu na Cidade",
    title: `Viu? Posta. ${CITY.name} inteira fica sabendo.`,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: `Viu? Posta. ${CITY.name} inteira fica sabendo.`, description: DESCRIPTION },
};

const FAQ = [
  { q: "O Viu é de graça?", a: "Sim. Pra quem posta, pra quem olha e, durante o piloto, pros comércios também." },
  { q: "Aparece meu nome nos posts?", a: "Não. Você entra com Google ou e-mail pra gente evitar spam, mas o post é anônimo. O apelido no ranking é opcional." },
  { q: "Por que o post some?", a: "Porque o que estava acontecendo há 12 horas já não é notícia. Trânsito some em 2h e alagamento em 6h." },
  { q: "Quem vê minha foto?", a: "Qualquer pessoa no mapa, mas com rostos e placas desfocados e sem os dados de localização do arquivo." },
  { q: "Como denuncio um post?", a: "Abra o post e toque em denunciar. A moderação analisa, e post falso também cai quando quem está perto nega." },
  { q: `Funciona fora de ${CITY.name}?`, a: `Por enquanto só em ${CITY.name}/${CITY.uf}. Peça a sua: as cidades com mais pedidos entram primeiro.` },
];

const TICKER = [
  { cat: "Trânsito", onde: "Av. Peixoto Gomide", ha: "há 2 min", c: "var(--warn)" },
  { cat: "Evento", onde: "Praça Duque de Caxias", ha: "há 5 min", c: "var(--accent)" },
  { cat: "Falta de energia", onde: "Vila Rio Branco", ha: "há 9 min", c: "var(--warn)" },
  { cat: "Acidente", onde: "SP-270", ha: "há 11 min", c: "var(--danger)" },
  { cat: "Alagamento", onde: "perto da rodoviária", ha: "há 14 min", c: "var(--warn)" },
  { cat: "Outro", onde: "feira do Centro", ha: "há 20 min", c: "var(--accent)" },
];

const TRUST = [
  "Posts sem o seu nome",
  "Rostos e placas desfocados automaticamente",
  "Toda foto passa por moderação, e dá pra denunciar",
  "Localização do arquivo apagada · exclua sua conta quando quiser",
];

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Viu na Cidade",
      url: SITE,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web, Android, iOS",
      inLanguage: "pt-BR",
      description: DESCRIPTION,
      areaServed: { "@type": "City", name: `${CITY.name}, ${CITY.uf}` },
      offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ],
};

// App instalado aberto num atalho antigo da raiz: vai ao mapa antes de pintar
const standaloneScript = `if(matchMedia("(display-mode: standalone)").matches||navigator.standalone)location.replace("/mapa")`;

function Arrow() {
  return (
    <svg className="lp-seta" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Check({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.2" strokeLinecap="round" className="mt-0.5 flex-none" aria-hidden="true">
      <path className={className} style={style} d="M5 12l5 5L20 7" />
    </svg>
  );
}

function SectionHead({ eyebrow, id, children, accent }: { eyebrow: string; id: string; children: ReactNode; accent?: boolean }) {
  return (
    <div className="lp-rv flex max-w-[640px] flex-col gap-2.5">
      <span className="lp-rot" style={accent ? { color: "var(--accent)" } : undefined}>{eyebrow}</span>
      <h2 id={id} className="lp-disp lp-h2">{children}</h2>
    </div>
  );
}

function Word({ children, delay, gold }: { children: string; delay: number; gold?: boolean }) {
  return (
    <span className="lp-w" style={{ animationDelay: `${delay}s`, color: gold ? "var(--accent)" : undefined }}>
      {children}
    </span>
  );
}

export default function Landing() {
  return (
    <div className="dark lp min-h-screen">
      <script dangerouslySetInnerHTML={{ __html: standaloneScript }} />
      <Reveal />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="lp-head">
        <div className="lp-wrap flex flex-wrap items-center gap-x-7 gap-y-3 py-3">
          <a href="#topo" aria-label="Viu na Cidade, início" className="lp-disp flex items-center gap-2.5 text-[22px]">
            <Mark size={32} />
            Viu
          </a>
          <nav aria-label="Seções" className="hidden flex-auto flex-wrap gap-x-5 gap-y-1 text-sm text-muted md:flex">
            <a href="#como" className="hover:text-ink">Como funciona</a>
            <a href="#comercios" className="hover:text-ink">Para comércios</a>
            <a href="#faq" className="hover:text-ink">Perguntas</a>
          </nav>
          <div className="ml-auto flex items-center gap-2.5">
            <a href="/mapa?entrar" className="flex min-h-11 items-center px-2.5 text-sm">Entrar</a>
            <a href="/mapa" className="lp-btn lp-btn-p" style={{ minHeight: 44 }}>Abrir o mapa</a>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section id="topo" aria-labelledby="h1" className="lp-wrap flex flex-wrap items-center gap-12 pb-16 pt-14">
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-[22px]">
            <span className="lp-rot lp-fade flex items-center gap-2" style={{ color: "var(--accent)" }}>
              <span className="lp-ponto" />
              {CITY.name} · {CITY.uf}
            </span>
            <h1 id="h1" className="lp-disp m-0 text-[clamp(40px,6vw,68px)] leading-[1.04]">
              <Word delay={0.05}>Viu?</Word> <Word delay={0.2} gold>Posta.</Word>
              <br />
              <Word delay={0.4}>{CITY.name}</Word> <Word delay={0.48}>inteira</Word> <Word delay={0.56}>fica</Word> <Word delay={0.64}>sabendo.</Word>
            </h1>
            <p className="lp-fade lp-muted m-0 max-w-[520px] text-lg" style={{ animationDelay: "0.6s" }}>
              Trânsito, alagamento, show na praça, fila no posto: alguém tirou a foto agora, do lugar exato. Daqui a pouco ela some, porque já
              deixou de ser novidade.
            </p>
            <div className="lp-fade flex flex-wrap gap-3" style={{ animationDelay: "0.75s" }}>
              <a href="/mapa" className="lp-btn lp-btn-p" style={{ minHeight: 52, padding: "0 26px", fontSize: 16 }}>
                Abrir o mapa, é grátis
                <Arrow />
              </a>
            </div>
            <span className="lp-fade lp-muted text-[13px]" style={{ animationDelay: "0.9s" }}>
              Funciona no navegador do celular · seu nome não aparece nos posts
            </span>
          </div>
          <div className="min-w-0 flex-[1_1_440px]">
            <LiveMap />
          </div>
        </section>

        {/* Post que some */}
        <FadingPost />

        {/* Faixa */}
        <div className="lp-faixa lp-alt" aria-hidden="true">
          <div className="lp-trilho">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="flex items-center gap-2.5 whitespace-nowrap text-sm">
                <span className="h-2 w-2 rounded-full" style={{ background: t.c }} />
                <strong className="font-semibold">{t.cat}</strong>
                <span className="lp-muted">{t.onde}</span>
                <span className="lp-num lp-muted text-xs">{t.ha}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Problema */}
        <section aria-labelledby="h-prob" style={{ background: "var(--surface)" }}>
          <div className="lp-wrap lp-sec flex flex-col gap-9">
            <SectionHead eyebrow="O problema" id="h-prob">Você só fica sabendo depois que já passou.</SectionHead>
            <div className="lp-grid lp-rvg">
              {[
                ["A notícia sai amanhã.", "E o trânsito era hoje, às 18h, na sua rua."],
                ["O grupo do zap não ajuda.", "É corrente, áudio de 3 minutos e foto de 2019."],
                ["Ninguém sabe onde foi.", "“Acidente perto do centro” pode ser em qualquer lugar."],
              ].map(([h, p], i) => (
                <div key={h} className="lp-card lp-card-bg">
                  <span className="lp-num text-[28px] font-medium" style={{ color: "var(--danger)" }}>0{i + 1}</span>
                  <h3 className="lp-disp mb-1.5 mt-2.5 text-[21px]">{h}</h3>
                  <p className="lp-muted m-0">{p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como" aria-labelledby="h-como" className="lp-wrap lp-sec flex flex-col gap-9">
          <SectionHead eyebrow="Como funciona" id="h-como">Viu? Posta. A cidade confirma. Depois some.</SectionHead>
          <ol className="lp-grid lp-rvg m-0 list-none p-0">
            <li className="lp-card flex flex-col gap-3">
              <div className="flex items-center justify-between"><span className="lp-num text-sm" style={{ color: "var(--accent)" }}>01</span><span className="lp-rot">Foto de agora</span></div>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <g className="lp-obt"><path d="M4 8h3l2-3h6l2 3h3v11H4Z" /><circle cx="12" cy="13" r="3.5" /></g>
                <circle className="lp-flash" cx="12" cy="13" r="10" fill="var(--ink)" stroke="none" />
              </svg>
              <h3 className="lp-disp m-0 text-[22px]">Viu? Posta.</h3>
              <p className="lp-muted m-0">É só tirar a foto e escolher a categoria. Seu nome não aparece.</p>
            </li>
            <li className="lp-card flex flex-col gap-3">
              <div className="flex items-center justify-between"><span className="lp-num text-sm" style={{ color: "var(--accent)" }}>02</span><span className="lp-rot">Até 1 km</span></div>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path className="lp-check" d="M8 12l3 3 5-6" />
              </svg>
              <h3 className="lp-disp m-0 text-[22px]">A cidade confirma.</h3>
              <p className="lp-muted m-0">Quem está perto diz se ainda está rolando. Notícia falsa cai rápido.</p>
            </li>
            <li className="lp-card flex flex-col gap-3">
              <div className="flex items-center justify-between"><span className="lp-num text-sm" style={{ color: "var(--accent)" }}>03</span><span className="lp-rot">2h a 12h</span></div>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <circle className="lp-relogio" cx="12" cy="12" r="9" transform="rotate(-90 12 12)" />
                <path className="lp-ponteiro" d="M12 12V6" />
              </svg>
              <h3 className="lp-disp m-0 text-[22px]">Some sozinho.</h3>
              <p className="lp-muted m-0">Fica de 2h a 12h no ar, conforme o tipo. O mapa está sempre fresco.</p>
            </li>
          </ol>
        </section>

        {/* Um dia na cidade */}
        <section aria-labelledby="h-dia" style={{ borderTop: "1px solid var(--line)" }}>
          <div className="lp-wrap lp-sec flex flex-col gap-9">
            <SectionHead eyebrow="Um dia em Itapetininga" id="h-dia">
              Toda hora tem alguma coisa acontecendo.
            </SectionHead>
            <div className="lp-rv">
              <DaySection />
            </div>
          </div>
        </section>

        {/* Story */}
        <section aria-labelledby="h-story" className="lp-alt">
          <div className="lp-wrap lp-sec flex flex-wrap items-center gap-12">
            <div className="lp-rv flex min-w-0 flex-[1_1_380px] flex-col gap-5">
              <span className="lp-rot">Story</span>
              <h2 id="h-story" className="lp-disp lp-h2">Toca no pin. Vê em story.</h2>
              <p className="lp-muted m-0 text-[17px]">
                Foto em tela cheia, uma atrás da outra, do jeito que você já está acostumado. Passe pro lado, segure pra pausar e diga se ainda
                está rolando sem sair do story.
              </p>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {["As mais recentes e as Em alta primeiro", "Confirma ou nega com um toque", "Manda no zap direto do story"].map((t, i) => (
                  <li key={t} className="flex gap-2.5">
                    <Check className="lp-check" style={{ animationDelay: `${i * 0.3}s` }} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lp-rv flex min-w-0 flex-[1_1_300px] justify-center">
              <StoryDemo />
            </div>
          </div>
        </section>

        {/* Alertas */}
        <section aria-labelledby="h-alerta" className="lp-wrap lp-sec flex flex-wrap items-center gap-12">
          <div className="lp-rv flex min-w-0 flex-[1_1_380px] flex-col gap-5">
            <span className="lp-rot" style={{ color: "var(--accent)" }}>Alertas por área</span>
            <h2 id="h-alerta" className="lp-disp lp-h2">Fica sabendo antes de sair de casa.</h2>
            <p className="lp-muted m-0 text-[17px]">
              Escolha o que importa pra você e o raio, de 500 m a 3 km. Quando alguém posta perto, o aviso chega na hora. Um toque e você
              está no story.
            </p>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {["Só as categorias que você escolher", "Pedidos de \u201cAlguém aí?\u201d perto de você", "Nada de spam: um aviso por acontecimento"].map((t, i) => (
                <li key={t} className="flex gap-2.5">
                  <Check className="lp-check" style={{ animationDelay: `${i * 0.3}s` }} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="lp-rv min-w-0 flex-[1_1_360px]">
            <LazyScene kind="alert" style={{ minHeight: 580 }} />
          </div>
        </section>

        {/* Recursos */}
        <section aria-labelledby="h-rec" style={{ borderTop: "1px solid var(--line)" }}>
          <div className="lp-wrap lp-sec flex flex-col gap-9">
            <SectionHead eyebrow="Recursos" id="h-rec">Mais do que um mapa de fotos.</SectionHead>
            <div className="lp-grid lp-rvg">
              {[
                ["Alguém aí?", "Marque um ponto no mapa e peça uma foto a quem está perto. Antes de sair de casa, você já sabe."],
                ["Alertas por área", "Receba aviso só do que importa, num raio de 500 m a 3 km."],
                ["Manda no zap", "Cada post tem um link com prévia: foto, categoria e quanto tempo falta."],
                ["Mapa de calor e Em alta", "Mostram onde a cidade está se mexendo agora e no último mês."],
              ].map(([h, p], i) => (
                <div key={h} className={`lp-card ${i === 0 ? "lp-viva" : ""}`}>
                  <h3 className="lp-disp mb-2 mt-0 text-xl" style={{ color: "var(--accent)" }}>{h}</h3>
                  <p className="lp-muted m-0">{p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Rostos e placas */}
        <section aria-labelledby="h-borra" className="lp-wrap lp-sec flex flex-wrap items-center gap-12">
          <div className="lp-rv min-w-0 flex-[1_1_480px] overflow-hidden rounded-2xl border border-line" style={{ aspectRatio: "11 / 9" }}>
            <LazyScene kind="blur" className="h-full w-full" title="Ilustração: o app acha dois rostos e uma placa na foto e desfoca os três" />
          </div>
          <div className="lp-rv flex min-w-0 flex-[1_1_360px] flex-col gap-5">
            <span className="lp-rot" style={{ color: "var(--accent)" }}>Privacidade</span>
            <h2 id="h-borra" className="lp-disp lp-h2">Rosto e placa? A gente borra.</h2>
            <p className="lp-muted m-0 text-[17px]">
              Antes de qualquer foto ir pro mapa, o Viu procura rostos e placas de carro e desfoca, até os pequenos lá no fundo. Ninguém
              aparece sem querer.
            </p>
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {[
                ["Varre", "a foto inteira, assim que você posta"],
                ["Acha", "cada rosto e cada placa, até os de longe"],
                ["Desfoca", "antes de publicar, e apaga a localização do arquivo"],
              ].map(([h, t], i) => (
                <li key={h} className="flex items-baseline gap-3">
                  <span className="lp-num text-sm" style={{ color: "var(--accent)" }}>0{i + 1}</span>
                  <span>
                    <strong className="font-semibold">{h}</strong> <span className="lp-muted">{t}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Confiança e gamificação */}
        <section aria-label="Confiança e gamificação" className="lp-alt">
          <div className="lp-wrap lp-sec lp-rvg flex flex-wrap gap-6">
            <div className="lp-card lp-card-bg flex min-w-0 flex-[1_1_420px] flex-col gap-4">
              <span className="lp-rot">Confiança</span>
              <h2 className="lp-disp m-0 text-[32px] leading-[1.1]">Anônimo pra quem vê. Cuidado com quem aparece.</h2>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {TRUST.map((t, i) => (
                  <li key={t} className="flex gap-2.5">
                    <Check className="lp-check" style={{ animationDelay: `${i * 0.3}s` }} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lp-card lp-card-bg flex min-w-0 flex-[1_1_420px] flex-col gap-4">
              <span className="lp-rot">Gamificação</span>
              <h2 className="lp-disp m-0 text-[32px] leading-[1.1]">De Curioso a Lenda de {CITY.name}.</h2>
              <p className="lp-muted m-0">Você ganha XP quando ajuda: post confirmado, resposta rápida a um pedido. Conquistas do bronze ao ouro.</p>
              <AchievementShowcase />
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="lp-rot" style={{ color: "var(--ink)" }}>Nível 2 · {levelName(2)}</span>
                  <span className="lp-num lp-muted text-xs">340 / 400 XP</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--elev)" }}>
                  <div className="lp-bar h-full rounded-full" style={{ width: "85%", background: "var(--accent)" }} />
                </div>
                <span className="lp-muted text-xs">Faltam 60 XP para {levelName(3)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Primeiro do bairro */}
        <section id="bairro" aria-labelledby="h-bairro" className="lp-wrap lp-sec flex flex-col gap-9">
          <SectionHead eyebrow="Primeiro do bairro" id="h-bairro" accent>
            Seja o primeiro Olheiro do seu bairro.
          </SectionHead>
          <p className="lp-muted lp-rv m-0 -mt-4 max-w-[640px] text-[17px]">
            O mapa fica bom quando o seu bairro tem gente postando. Marque o seu, chame os vizinhos e veja quais bairros estão na frente.
          </p>
          <div className="lp-rv">
            <FirstInNeighborhood />
          </div>
        </section>

        {/* Comércios */}
        <section id="comercios" aria-labelledby="h-com" className="lp-wrap lp-sec flex flex-wrap items-start gap-12">
          <div className="lp-rv flex min-w-0 flex-[1_1_420px] flex-col gap-[18px]">
            <span className="lp-rot" style={{ color: "var(--accent)" }}>Para comércios</span>
            <h2 id="h-com" className="lp-disp lp-h2">Seu comércio no mapa, na hora certa.</h2>
            <p className="lp-muted m-0 text-[17px]">
              Promoção relâmpago, evento, prato do dia? Comércios verificados postam com o selo <strong className="text-ink">Divulgação</strong> e
              aparecem pra quem está passando perto.
            </p>
            <span className="lp-selo self-start rounded-full px-3.5 py-1.5 text-sm font-semibold" style={{ border: "1px solid var(--ok)", color: "var(--ok)" }}>
              Grátis durante o piloto
            </span>
          </div>
          <div className="lp-card lp-rv flex min-w-0 flex-[1_1_420px] flex-col gap-4">
            <span className="lp-rot">Simule a sua divulgação</span>
            <AdSimulator />
            <ol className="lp-muted m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
              <li className="flex gap-2.5"><span className="lp-num" style={{ color: "var(--accent)" }}>1</span>Entre no Viu, de dentro do seu comércio.</li>
              <li className="flex gap-2.5"><span className="lp-num" style={{ color: "var(--accent)" }}>2</span>Preencha o pedido: nome, ramo e contato.</li>
              <li className="flex gap-2.5"><span className="lp-num" style={{ color: "var(--accent)" }}>3</span>A moderação confere o endereço e libera.</li>
            </ol>
            <a href="/mapa?comercio" className="lp-btn lp-btn-p w-full">
              Quero divulgar meu negócio
              <Arrow />
            </a>
          </div>
        </section>

        {/* Outras cidades */}
        <section aria-labelledby="h-cid" className="lp-alt">
          <div className="lp-wrap lp-rv flex flex-wrap items-center justify-between gap-5 py-14">
            <div className="flex flex-[1_1_360px] flex-col gap-1.5">
              <h2 id="h-cid" className="lp-disp m-0 text-[28px]">Não é de {CITY.name}?</h2>
              <p className="lp-muted m-0">Peça o Viu na sua cidade. As cidades com mais pedidos entram primeiro.</p>
            </div>
            <a href="/mapa" className="lp-btn lp-btn-s">
              Quero o Viu na minha cidade
              <Arrow />
            </a>
          </div>
        </section>

        {/* Perguntas */}
        <section id="faq" aria-labelledby="h-faq" className="lp-sec mx-auto flex max-w-[820px] flex-col gap-6 px-5">
          <h2 id="h-faq" className="lp-disp lp-h2 lp-rv">Perguntas rápidas</h2>
          <div className="lp-faq lp-rvg flex flex-col border-t border-line">
            {FAQ.map((f) => (
              <details key={f.q} className="border-b border-line">
                <summary>
                  <h3 className="m-0 [font:inherit]">{f.q}</h3>
                  <span className="lp-plus" aria-hidden="true">+</span>
                </summary>
                <p className="lp-muted mb-5 mt-0">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section aria-labelledby="h-cta" className="relative overflow-hidden" style={{ borderTop: "1px solid var(--line)" }}>
          <div className="lp-wrap lp-rv relative flex flex-col items-center gap-[26px] pb-10 pt-24 text-center">
            <h2 id="h-cta" className="lp-disp m-0 max-w-[820px] text-[clamp(36px,5.5vw,64px)] leading-[1.04]">
              A cidade está acontecendo agora. <span style={{ color: "var(--accent)" }}>Viu?</span>
            </h2>
            <a href="/mapa" className="lp-btn lp-btn-p" style={{ minHeight: 56, padding: "0 32px", fontSize: 17 }}>
              Abrir o mapa
              <Arrow />
            </a>
            <LazyScene kind="city" className="mt-4 w-full max-w-[760px]" style={{ aspectRatio: "560 / 440" }} />
          </div>
        </section>
      </main>

      <footer style={{ borderTop: "1px solid var(--line)" }}>
        <div className="lp-wrap lp-muted flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-6 text-[13px]">
          <span className="lp-disp text-base text-ink">Viu na Cidade · {CITY.name}/{CITY.uf}</span>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a href="/termos" className="underline-offset-4 hover:underline">Termos e privacidade</a>
            <PauseButton />
          </div>
        </div>
      </footer>
    </div>
  );
}
