// PROVISÓRIO: telas do app redesenhadas com os tokens, só para os quadros de estilo. Na Fase B elas são trocadas
// pelas capturas reais (scripts/capturar-telas.mjs, instância local com o seed de demonstração).
import React from 'react';
import { MONO } from '../fontes';
import { Icone, type NomeIcone } from '../componentes/Icone';
import { Foto, type NomeIlustracao } from '../ilustracoes';
import { COR } from '../tema';

const SISTEMA = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const rotulo: React.CSSProperties = { fontFamily: MONO, fontSize: 10, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: COR.muted };

// Fundo de mapa escuro, só para dar contexto atrás da folha
const MapaDeFundo: React.FC = () => (
  <svg width={390} height={844} style={{ position: 'absolute', inset: 0 }}>
    <rect width={390} height={844} fill="#15171b" />
    {[[-20, 120, 420, 60], [-20, 400, 420, 330], [-20, 640, 420, 700], [60, -10, 140, 860], [250, -10, 300, 860], [330, -10, 200, 860]].map(([x1, y1, x2, y2], i) => (
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i % 2 ? '#4d5461' : '#343a44'} strokeWidth={i % 2 ? 9 : 6} />
    ))}
    <rect x={150} y={180} width={90} height={70} fill="#172a20" />
  </svg>
);

const Chip: React.FC<{ icone: NomeIcone; texto: string; ativo?: boolean }> = ({ icone, texto, ativo }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, borderRadius: 999, padding: '8px 12px', fontSize: 14, fontFamily: SISTEMA,
    border: `1px solid ${ativo ? COR.accent : COR.line}`, background: ativo ? COR.accent : COR.surface, color: ativo ? COR.accentInk : COR.muted, fontWeight: ativo ? 500 : 400,
  }}>
    <Icone nome={icone} tamanho={17} />
    {texto}
  </span>
);

export const RegistrarProvisoria: React.FC<{ foto: NomeIlustracao; t: number; legenda: string; apertado?: number }> = ({ foto, t, legenda, apertado = 0 }) => (
  <div style={{ position: 'absolute', inset: 0, fontFamily: SISTEMA, color: COR.ink }}>
    <MapaDeFundo />
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)' }} />
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: COR.surface, borderTop: `1px solid ${COR.line}`, borderRadius: '16px 16px 0 0' }}>
      <div style={{ padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <p style={{ ...rotulo, margin: '0 0 4px' }}>Novo registro</p>
            <h2 style={{ margin: 0, fontFamily: 'Archivo Viu', fontWeight: 600, fontSize: 20, lineHeight: 1.25 }}>O que está acontecendo aqui?</h2>
          </div>
          <span style={{ width: 36, height: 36, borderRadius: 99, border: `1px solid ${COR.line}`, display: 'grid', placeItems: 'center', color: COR.muted }}><Icone nome="fechar" tamanho={20} /></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 96, height: 96, borderRadius: 12, overflow: 'hidden', border: `1px solid ${COR.line}`, flexShrink: 0 }}>
            <svg width={96} height={96}><Foto nome={foto} t={t} x={0} y={0} largura={96} altura={96} quadrado /></svg>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${COR.line}`, borderRadius: 999, padding: '6px 12px', fontSize: 12, color: COR.muted }}>
            <Icone nome="camera" tamanho={15} /> Tirar outra
          </span>
        </div>
        <p style={{ ...rotulo, margin: '0 0 8px' }}>O que é</p>
        <div style={{ display: 'flex', gap: 8, overflow: 'hidden', marginBottom: 16 }}>
          <Chip icone="evento" texto="Evento" ativo />
          <Chip icone="transito" texto="Trânsito" />
          <Chip icone="acidente" texto="Acidente" />
          <Chip icone="alagamento" texto="Alagamento" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={rotulo}>Legenda (opcional)</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: COR.muted }}>{legenda.length}/140</span>
        </div>
        <div style={{ border: `1px solid ${COR.line}`, background: COR.bg, borderRadius: 8, padding: '10px 12px', fontSize: 16, marginBottom: 16 }}>{legenda}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
          <span>Guardar no histórico por 30 dias<span style={{ display: 'block', fontSize: 12, color: COR.muted }}>Você tira quando quiser em Meus posts.</span></span>
          <span style={{ width: 20, height: 20, borderRadius: 4, border: `1.5px solid ${COR.line}` }} />
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${COR.line}`, padding: '12px 20px 30px' }}>
        <div style={{
          background: COR.accent, color: COR.accentInk, fontWeight: 600, fontSize: 16, borderRadius: 8, padding: '12px 20px', textAlign: 'center',
          transform: `translateY(${apertado}px)`, opacity: 1 - apertado * 0.08,
        }}>
          Publicar · some em 12h
        </div>
      </div>
    </div>
  </div>
);
