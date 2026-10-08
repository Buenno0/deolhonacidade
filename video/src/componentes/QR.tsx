// QR code em SVG (módulos escuros sobre papel claro: é o que todo leitor de celular entende).
import React from 'react';
import QRCode from 'qrcode';
import { COR } from '../tema';

export const SITE = 'https://viunacidade.com.br';

export const QR: React.FC<{ texto?: string; tamanho: number }> = ({ texto = SITE, tamanho }) => {
  const qr = React.useMemo(() => QRCode.create(texto, { errorCorrectionLevel: 'M' }), [texto]);
  const n = qr.modules.size;
  const margem = 2;
  const total = n + margem * 2;
  const caminho: string[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (qr.modules.get(x, y)) caminho.push(`M${x + margem} ${y + margem}h1v1h-1z`);
    }
  }
  return (
    <svg viewBox={`0 0 ${total} ${total}`} width={tamanho} height={tamanho} shapeRendering="crispEdges" style={{ display: 'block', borderRadius: tamanho * 0.06 }}>
      <rect width={total} height={total} fill={COR.ink} />
      <path d={caminho.join('')} fill={COR.bg} />
    </svg>
  );
};
