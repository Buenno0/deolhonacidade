import Mark from "@/components/ui/Mark";
import { Tag } from "@/components/ui/Tag";
import { FloodScene } from "./scenes";

// Alertas por área, na linha do vídeo do BeReal: tela de bloqueio parada, o
// alerta salta maior que o celular e assenta, um toque nele e a tela vira o
// story enquanto o celular gira. Só CSS (ciclo de 9 s em app/landing.css);
// parado até a seção entrar na tela (.lp-rv/.lp-in).
export default function AlertPhone() {
  return (
    <div className="lp-al-cena" aria-hidden="true">
      <div className="lp-al-fone">
        {/* tela de bloqueio */}
        <div className="lp-al-bloqueio">
          <svg viewBox="0 0 300 600" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
            <rect width="300" height="600" fill="#140d08" />
            <path d="M-40 250 C60 170 150 300 340 190 L340 600 L-40 600Z" fill="#9c3f1d" />
            <path d="M-40 330 C80 250 170 380 340 300 L340 600 L-40 600Z" fill="#c2552c" />
            <path d="M-40 410 C90 350 180 470 340 390 L340 600 L-40 600Z" fill="#d29a44" />
            <path d="M-40 490 C100 440 190 540 340 470 L340 600 L-40 600Z" fill="#3563d9" />
          </svg>
          <div className="relative flex flex-col items-center pt-12 text-center" style={{ color: "#f4efe4" }}>
            <span className="text-[13px] font-medium opacity-90">terça-feira, 7 de outubro</span>
            <span className="lp-disp text-[64px] leading-none">18:07</span>
          </div>
          <span className="lp-al-dica">toque</span>
        </div>

        {/* o que abre: o story do alagamento */}
        <div className="lp-al-story sala-escura">
          <FloodScene className="lp-cena absolute inset-0" vb="40 20 360 360" />
          <div className="story-blur-base" />
          <div className="absolute inset-x-0 top-0 flex gap-1 px-3 pt-3">
            <span className="story-barra"><i className="lp-al-enche" /></span>
            <span className="story-barra" />
          </div>
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 px-4 pb-6 text-ink">
            <span className="flex"><Tag kind="agora" /></span>
            <span className="lp-disp text-lg leading-tight">Rua cheia perto da rodoviária, carro baixo não passa.</span>
          </div>
        </div>
      </div>

      {/* a notificação, fora do celular para poder passar das bordas */}
      <div className="lp-al-notif">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: "#0c0a08" }}>
          <Mark size={24} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <strong className="flex items-center gap-1 text-[13px]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dca84a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 2 20h20Z M12 10v4 M12 17h.01" /></svg>
              Alagamento a 400 m de você
            </strong>
            <span className="text-[11px] opacity-60">agora</span>
          </span>
          <span className="block text-[12.5px] leading-snug opacity-90">Rua da rodoviária encheu. Some do mapa em 5:12, confere antes de sair.</span>
        </span>
      </div>
    </div>
  );
}
