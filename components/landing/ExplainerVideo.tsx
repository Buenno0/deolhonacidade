"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "./lang";

// O vídeo de 1 minuto (feito em video/, com Remotion). Antes do play, o cartão
// mostra o loop mudo da cidade como capa viva: ele só carrega quando o cartão
// chega perto da tela e para fora dela, com "Pausar animações", com movimento
// reduzido ou com economia de dados (nesses casos fica a imagem parada). O play
// é um toque de quem vê, então o vídeo já sai com som: 16:9 no computador e
// 9:16 no celular em pé, onde o texto do vídeo fica legível.

const V = "/video/";
const RETRATO = "(max-width: 640px) and (orientation: portrait)";
// O link "Ver em 1 minuto" do topo dispara este evento; o play acontece dentro
// do mesmo toque, que é o que libera o som (no Safari também).
const EVENTO = "viu:video";

export function VideoLink({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <a
      href="#video"
      className={className}
      style={style}
      onClick={(e) => {
        e.preventDefault();
        window.dispatchEvent(new Event(EVENTO));
      }}
    >
      {children}
    </a>
  );
}

function Play({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

const calmo = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ||
  Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);

export default function ExplainerVideo() {
  const T = useT();
  const t = T.video;
  const caixa = useRef<HTMLDivElement>(null);
  const previa = useRef<HTMLVideoElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const visivel = useRef(false);
  const [retrato, setRetrato] = useState(false);
  const [perto, setPerto] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [fim, setFim] = useState(false);

  // formato pela tela (troca se o celular girar antes do play)
  useEffect(() => {
    const mq = matchMedia(RETRATO);
    const sync = () => setRetrato(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // a capa viva só anda visível e sem o "Pausar animações" da LP
  const sync = useCallback(() => {
    const v = previa.current;
    if (!v) return;
    if (visivel.current && !document.querySelector(".lp-pausado")) v.play().catch(() => {});
    else v.pause();
  }, []);

  useEffect(() => {
    const el = caixa.current;
    if (!el || calmo()) return;
    const chega = new IntersectionObserver(([e]) => e.isIntersecting && (setPerto(true), chega.disconnect()), { rootMargin: "600px 0px" });
    const ve = new IntersectionObserver(([e]) => ((visivel.current = e.isIntersecting), sync()), { threshold: 0.25 });
    chega.observe(el);
    ve.observe(el);
    const mo = new MutationObserver(sync);
    const root = document.querySelector(".lp");
    if (root) mo.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => (chega.disconnect(), ve.disconnect(), mo.disconnect());
  }, [sync]);

  useEffect(() => {
    if (perto) sync();
  }, [perto, retrato, sync]);

  // o play chama video.play() direto no toque: é isso que deixa sair com som
  const tocar = useCallback(() => {
    const v = video.current;
    if (!v) return;
    const arquivo = V + (matchMedia(RETRATO).matches ? "viu-explicativo-9x16.mp4" : "viu-explicativo-16x9.mp4");
    if (!v.currentSrc.endsWith(arquivo)) v.src = arquivo;
    v.muted = false;
    if (v.ended) v.currentTime = 0;
    v.play().catch(() => {});
    previa.current?.pause();
    setTocando(true);
    setFim(false);
    v.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const chamado = () => {
      tocar();
      caixa.current?.scrollIntoView({ behavior: calmo() ? "auto" : "smooth", block: "center" });
    };
    window.addEventListener(EVENTO, chamado);
    return () => window.removeEventListener(EVENTO, chamado);
  }, [tocar]);

  const poster = V + (retrato ? "viu-explicativo-9x16.webp" : "viu-explicativo-16x9.webp");

  return (
    <div>
      <div ref={caixa} className="lp-video">
        <video
          ref={video}
          src={V + "viu-explicativo-16x9.mp4"}
          poster={poster}
          preload="none"
          playsInline
          controls={tocando}
          aria-label={t.label}
          aria-describedby="video-texto"
          onEnded={() => setFim(true)}
          onPlay={() => setFim(false)}
        />
        {!tocando && (
          <button type="button" className="lp-video-capa" onClick={tocar} aria-label={t.play}>
            <picture>
              <source media={RETRATO} srcSet={V + "viu-explicativo-9x16.webp"} type="image/webp" />
              <source srcSet={V + "viu-explicativo-16x9.webp"} type="image/webp" />
              <img src={V + "viu-explicativo-16x9.jpg"} alt="" loading="lazy" decoding="async" />
            </picture>
            {perto && (
              <video
                ref={previa}
                key={retrato ? "9x16" : "16x9"}
                src={V + (retrato ? "viu-hero-9x16.mp4" : "viu-hero-16x9.mp4")}
                muted
                loop
                playsInline
                preload="auto"
                aria-hidden="true"
                onLoadedData={sync}
              />
            )}
            <span className="lp-video-acao">
              <span className="lp-video-play"><Play size={26} /></span>
              <span className="flex flex-col items-start gap-0.5 text-left">
                <span className="text-[17px] font-semibold text-ink">{t.cta}</span>
                <span className="lp-num text-xs text-muted">{t.meta}</span>
              </span>
            </span>
          </button>
        )}
        {fim && (
          <div className="lp-video-fim">
            <a href="/mapa" className="lp-btn lp-btn-p" style={{ minHeight: 52, padding: "0 26px", fontSize: 16 }}>
              {T.hero.cta}
            </a>
            <button type="button" onClick={tocar} className="lp-btn lp-btn-s">
              {t.again}
            </button>
          </div>
        )}
      </div>
      <details className="lp-video-texto mt-4 text-sm">
        <summary className="lp-muted min-h-11 cursor-pointer py-2">{t.transcriptTitle}</summary>
        <p id="video-texto" className="lp-muted m-0 max-w-[760px]">{t.transcript}</p>
      </details>
    </div>
  );
}
