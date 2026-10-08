// Peças comuns das cenas do explicativo: câmera da miniatura, espera das fontes, cartela de texto.
import React from 'react';
import { continueRender, delayRender } from 'remotion';
import { ARCHIVO, MONO } from '../fontes';
import type { Camera } from '../hero/Hero';
import { cl, outBack } from '../miniatura/iso';
import { COR } from '../tema';

// Ponto do mundo da miniatura → pixel do quadro
export const paraTela = (wx: number, wy: number, c: Camera, W: number, H: number): [number, number] => {
  const k = H / c.altura;
  const w = (c.altura * W) / H;
  return [(wx - (c.cx - w / 2)) * k, (wy - (c.cy - c.altura / 2)) * k];
};

// Medir texto exige a fonte carregada. document.fonts.check() diz "pronto" quando a família nem foi registrada ainda,
// então confere a FontFace carregada de verdade.
const carregada = (familia: string) => {
  let ok = false;
  document.fonts.forEach((f) => { if (f.family.replace(/"/g, '') === familia && f.status === 'loaded') ok = true; });
  return ok;
};
const fontesCarregadas = () => carregada(ARCHIVO) && carregada(MONO);

// Se a fonte já está carregada, a medida sai no mesmo quadro. Se não, o quadro espera e só é liberado depois que o
// layout medido já foi desenhado (o continueRender roda no efeito, depois do commit).
export function useFontesProntas() {
  const [prontas, setProntas] = React.useState(fontesCarregadas);
  const [espera] = React.useState(() => (fontesCarregadas() ? null : delayRender('fontes da marca')));
  React.useEffect(() => {
    if (prontas) {
      if (espera !== null) continueRender(espera);
      return;
    }
    let vivo = true;
    const inicio = Date.now();
    const checar = () => {
      if (fontesCarregadas() || Date.now() - inicio > 5000) {
        if (vivo) setProntas(true);
      } else {
        setTimeout(checar, 25);
      }
    };
    checar();
    return () => { vivo = false; };
  }, [prontas, espera]);
  return prontas;
}

// Cartela: cada palavra sobe e aparece, uma depois da outra (sem desfoque, sem sombra)
export const Cartela: React.FC<{
  texto: string; t: number; de?: number; tamanho: number; peso?: 600 | 700; cor?: string; saida?: number; style?: React.CSSProperties;
}> = ({ texto, t, de = 0, tamanho, peso = 700, cor = COR.ink, saida, style }) => {
  // "\n" quebra a linha onde a frase pede (nunca deixar o navegador decidir)
  const linhas = texto.split('\n').map((l) => l.split(' '));
  const fora = saida !== undefined ? cl((t - saida) / 0.35) : 0;
  let n = 0;
  return (
    <div style={{ fontFamily: ARCHIVO, fontWeight: peso, fontSize: tamanho, lineHeight: 1.08, letterSpacing: '-0.015em', color: cor, ...style }}>
      {linhas.map((palavras, li) => (
        <div key={li} style={{ whiteSpace: 'nowrap' }}>
          {palavras.map((p, i) => {
            const a = cl((t - de - n++ * 0.06) / 0.45);
            const e = outBack(a);
            return (
              <span key={i} style={{
                display: 'inline-block', marginRight: '0.24em',
                opacity: cl(a * 2) * (1 - fora), transform: `translateY(${((1 - e) * 0.35 - fora * 0.2).toFixed(3)}em)`,
              }}>
                {p}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
