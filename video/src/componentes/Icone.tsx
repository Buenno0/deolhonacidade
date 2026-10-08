// Ícones do app (components/ui/icons.tsx): viewBox 24, traço 1,8, pontas e junções redondas, cor herdada.
// Nunca ícone de biblioteca com outro traço.
import React from 'react';

const CAMINHOS = {
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </>
  ),
  pino: (
    <>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  fechar: <path d="M6 6l12 12M18 6 6 18" />,
  sino: (
    <>
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  pergunta: (
    <>
      <path d="M4 5h16v11H9l-5 4V5z" />
      <path d="M10 9a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.2M12 14h.01" />
    </>
  ),
  transito: (
    <>
      <path d="M5 16V11l2-5h10l2 5v5" />
      <path d="M3 16h18v2H3zM7 18v2M17 18v2" />
      <circle cx="8" cy="13" r=".8" />
      <circle cx="16" cy="13" r=".8" />
    </>
  ),
  alagamento: (
    <>
      <path d="M2 16c2 0 2-1.5 4-1.5S8 16 10 16s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" />
      <path d="M2 20c2 0 2-1.5 4-1.5S8 20 10 20s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" />
      <path d="M12 3s-4 4.5-4 7a4 4 0 0 0 8 0c0-2.5-4-7-4-7z" />
    </>
  ),
  evento: (
    <>
      <path d="M4 20 9 7l8 8-13 5z" />
      <path d="M14 4v2M19 9h2M17.5 5.5 16 7M20 13l-1.5-.5" />
    </>
  ),
  obra: (
    <>
      <path d="M3 20h18M5 20l3-12h8l3 12" />
      <path d="M7 14h10M6.5 17h11" />
    </>
  ),
  acidente: (
    <>
      <path d="M12 3 2 20h20L12 3z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  seguranca: (
    <>
      <path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3z" />
      <path d="M12 8v5M12 16h.01" />
    </>
  ),
  falta_energia: <path d="M13 2 5 14h6l-1 8 8-12h-6l1-8z" />,
  outro: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="8" cy="12" r=".8" />
      <circle cx="12" cy="12" r=".8" />
      <circle cx="16" cy="12" r=".8" />
    </>
  ),
  estabelecimento: (
    <>
      <path d="M3 9.5 5 4h14l2 5.5" />
      <path d="M3 9.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      <path d="M5 12v8h14v-8M10 20v-5h4v5" />
    </>
  ),
};
export type NomeIcone = keyof typeof CAMINHOS;

export const Icone: React.FC<{ nome: NomeIcone; tamanho?: number; cor?: string; style?: React.CSSProperties }> = ({ nome, tamanho = 20, cor = 'currentColor', style }) => (
  <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} fill="none" stroke={cor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {CAMINHOS[nome]}
  </svg>
);
