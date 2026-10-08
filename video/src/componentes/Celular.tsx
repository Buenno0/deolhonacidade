// Moldura de celular para as telas do app. O conteúdo é desenhado no tamanho da captura (390×844 px de CSS,
// tema escuro) e escalado. Sem sombra (regra do design system): o aparelho se separa do fundo pela borda.
import React from 'react';
import { COR } from '../tema';

export const TELA = { largura: 390, altura: 844 };
export const STATUS = 47;

export const larguraCelular = (altura: number) => {
  const bisel = altura * 0.018;
  return (TELA.largura * (altura - bisel * 2)) / (TELA.altura + STATUS) + bisel * 2;
};

// Barra de status do aparelho (47 px de CSS, acima da captura)
export const BarraStatus: React.FC<{ hora?: string }> = ({ hora = '21:14' }) => (
  <div style={{ height: STATUS, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 30px 0 36px', fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 600, fontSize: 16, color: COR.ink, background: COR.bg }}>
    <span>{hora}</span>
    <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill={COR.ink} /><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill={COR.ink} /><rect x="10" y="3" width="3" height="9" rx="1" fill={COR.ink} /><rect x="15" y="0" width="3" height="12" rx="1" fill={COR.ink} /></svg>
      <svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.5" fill="none" stroke={COR.ink} opacity=".45" /><rect x="2.5" y="2.5" width="17" height="8" rx="2" fill={COR.ink} /><rect x="25" y="4.5" width="1.6" height="4" rx=".8" fill={COR.ink} opacity=".45" /></svg>
    </span>
  </div>
);

export const Celular: React.FC<{ altura: number; hora?: string; children: React.ReactNode }> = ({ altura, hora = '21:14', children }) => {
  const bisel = altura * 0.018;
  const alturaTela = altura - bisel * 2;
  const escala = alturaTela / (TELA.altura + STATUS);
  const larguraTela = TELA.largura * escala;
  const largura = larguraTela + bisel * 2;
  return (
    <div style={{ width: largura, height: altura, borderRadius: largura * 0.15, background: '#1a1714', padding: bisel, boxSizing: 'border-box', border: `2px solid ${COR.line}` }}>
      <div style={{ width: larguraTela, height: alturaTela, borderRadius: largura * 0.125, overflow: 'hidden', position: 'relative', background: COR.bg }}>
        <div style={{ width: TELA.largura, height: TELA.altura + STATUS, transform: `scale(${escala})`, transformOrigin: '0 0', position: 'absolute' }}>
          <BarraStatus hora={hora} />
          <div style={{ width: TELA.largura, height: TELA.altura, position: 'relative', overflow: 'hidden' }}>{children}</div>
        </div>
        <div style={{ position: 'absolute', top: alturaTela * 0.012, left: '50%', width: larguraTela * 0.3, height: larguraTela * 0.085, marginLeft: -larguraTela * 0.15, borderRadius: 99, background: '#000' }} />
      </div>
    </div>
  );
};
