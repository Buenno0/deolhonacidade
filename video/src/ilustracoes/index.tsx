// As "fotos" do vídeo: ilustrações em código (nada de foto real nem de imagem gerada por IA).
import React from 'react';
import { Alagamento } from './Alagamento';
import { Desfoque } from './Desfoque';
import { H, W } from './comum';
import { Feira } from './Feira';
import { Fila } from './Fila';
import { Obra } from './Obra';
import { SeuComercio } from './SeuComercio';
import { Show } from './Show';
import { Transito } from './Transito';

export const ILUSTRACOES = {
  feira: Feira,
  obra: Obra,
  show: Show,
  fila: Fila,
  alagamento: Alagamento,
  transito: Transito,
  comercio: SeuComercio,
  desfoque: Desfoque,
} as const;
export type NomeIlustracao = keyof typeof ILUSTRACOES;

// A ilustração dentro de um retângulo, cortada como foto (cobre e corta o que sobra). Em `quadrado`, usa o miolo
// 300×300 do retrato, que é como ela aparece dentro do pino.
export const Foto: React.FC<{ nome: NomeIlustracao; t: number; x: number; y: number; largura: number; altura: number; quadrado?: boolean }> = ({
  nome, t, x, y, largura, altura, quadrado,
}) => {
  const Comp = ILUSTRACOES[nome];
  return (
    <svg x={x} y={y} width={largura} height={altura} viewBox={quadrado ? `0 50 ${W} ${W}` : `0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" overflow="hidden">
      <Comp t={t} />
    </svg>
  );
};
