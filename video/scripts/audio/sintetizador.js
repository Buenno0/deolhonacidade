/* Sintetizador do vídeo: roda dentro do Chrome (OfflineAudioContext), chamado por scripts/audio.mjs.
 * Gera duas faixas em WAV (float 32): a música original e os efeitos. Tudo sintetizado aqui, nenhum sample de
 * terceiros. Porte do sintetizador do vídeo do Rota Solidária, com outra música: cidade à noite, 100 BPM, acordes
 * com sétima e nona, Rhodes, pluck, sub e percussão leve. A assinatura do Viu é o "ping" de duas notas do selo
 * "Agora" (efeito "ping"), que volta no fim. */
(function () {
  'use strict';
  const SR = 48000;

  function semente(s) {
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function bufferRuido(ctx, rnd, segundos) {
    const b = ctx.createBuffer(2, Math.ceil(segundos * ctx.sampleRate), ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i++) { d[i] = rnd() * 2 - 1; } }
    return b;
  }
  function impulso(ctx, rnd, dur, queda) {
    const n = Math.ceil(dur * ctx.sampleRate);
    const b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) { d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / n, queda); } }
    return b;
  }
  function wavBase64(buffer) {
    const canais = buffer.numberOfChannels, n = buffer.length, bytes = 44 + n * canais * 4;
    const ab = new ArrayBuffer(bytes), v = new DataView(ab);
    const txt = (o, s) => { for (let i = 0; i < s.length; i++) { v.setUint8(o + i, s.charCodeAt(i)); } };
    txt(0, 'RIFF'); v.setUint32(4, bytes - 8, true); txt(8, 'WAVE'); txt(12, 'fmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 3, true); v.setUint16(22, canais, true); v.setUint32(24, buffer.sampleRate, true);
    v.setUint32(28, buffer.sampleRate * canais * 4, true); v.setUint16(32, canais * 4, true); v.setUint16(34, 32, true);
    txt(36, 'data'); v.setUint32(40, n * canais * 4, true);
    const dados = []; for (let c = 0; c < canais; c++) { dados.push(buffer.getChannelData(c)); }
    let o = 44;
    for (let i = 0; i < n; i++) { for (let c = 0; c < canais; c++) { v.setFloat32(o, dados[c][i], true); o += 4; } }
    const u8 = new Uint8Array(ab); let bin = '';
    for (let i = 0; i < u8.length; i += 0x8000) { bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); }
    return btoa(bin);
  }

  /* ------------------------------ Música ------------------------------ */
  async function musica(cfg) {
    const ctx = new OfflineAudioContext(2, Math.ceil(cfg.duracao * SR), SR);
    const rnd = semente(7);
    const ruido = bufferRuido(ctx, rnd, 3);
    const beat = 60 / cfg.bpm, bar = beat * 4;
    const saida = ctx.createGain(); saida.connect(ctx.destination);
    const rev = ctx.createConvolver(); rev.buffer = impulso(ctx, rnd, 2.8, 3.2);
    const volta = ctx.createGain(); volta.gain.value = 0.32; rev.connect(volta); volta.connect(saida);
    const enviar = (no, quanto) => { const s = ctx.createGain(); s.gain.value = quanto; no.connect(s); s.connect(rev); };

    // Rhodes: senoides com um pouco de inarmonia e tremolo lento
    function rhodes(m, t, vel, dur, pan = 0) {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
      const trem = ctx.createGain(); trem.gain.value = 1;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 4.6; const lfoG = ctx.createGain(); lfoG.gain.value = 0.18;
      lfo.connect(lfoG); lfoG.connect(trem.gain); lfo.start(t); lfo.stop(t + dur * 2.2);
      const p = ctx.createStereoPanner(); p.pan.value = pan;
      lp.connect(trem); trem.connect(p); p.connect(saida); enviar(trem, 0.35);
      const f = hz(m);
      [[1, 1], [2, 0.32], [3, 0.08], [7.1, 0.03]].forEach(([k, a]) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * k;
        const g = ctx.createGain(); const amp = vel * 0.22 * a;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.006);
        g.gain.setTargetAtTime(0, t + 0.006, (dur / 3) / (k > 3 ? 4 : 1));
        o.connect(g); g.connect(lp); o.start(t); o.stop(t + dur * 2.2);
      });
    }
    // Pluck: triângulo curto e filtrado (o arpejo da cidade)
    function pluck(m, t, vel, brilho) {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
      lp.frequency.setValueAtTime(brilho, t); lp.frequency.exponentialRampToValueAtTime(400, t + 0.35);
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.16, t + 0.003); g.gain.setTargetAtTime(0, t + 0.003, 0.12);
      const p = ctx.createStereoPanner(); p.pan.value = (rnd() - 0.5) * 0.7;
      lp.connect(g); g.connect(p); p.connect(saida); enviar(g, 0.45);
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(m);
      o.connect(lp); o.start(t); o.stop(t + 0.8);
    }
    function pad(notas, t, dur, vol, corte, ataque = 1.2) {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.5; lp.frequency.value = corte;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, Math.max(0, t - ataque * 0.5)); g.gain.linearRampToValueAtTime(vol, t + ataque * 0.5);
      g.gain.setValueAtTime(vol, t + dur - ataque * 0.5); g.gain.linearRampToValueAtTime(0, t + dur + ataque * 0.5);
      lp.connect(g); g.connect(saida); enviar(g, 0.9);
      for (const m of notas) {
        for (const d of [-7, 7]) {
          const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = d;
          const pn = ctx.createStereoPanner(); pn.pan.value = d > 0 ? 0.4 : -0.4;
          const ga = ctx.createGain(); ga.gain.value = 0.035;
          o.connect(ga); ga.connect(pn); pn.connect(lp); o.start(Math.max(0, t - ataque * 0.5)); o.stop(t + dur + ataque * 0.5 + 0.05);
        }
      }
    }
    function sub(m, t, dur, vol) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.015); g.gain.setTargetAtTime(vol * 0.7, t + 0.06, 0.2); g.gain.setTargetAtTime(0, t + dur, 0.05);
      g.connect(saida);
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(m);
      const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = hz(m);
      const g2 = ctx.createGain(); g2.gain.value = 0.25; o2.connect(g2); g2.connect(g);
      o.connect(g); o.start(t); o.stop(t + dur + 0.4); o2.start(t); o2.stop(t + dur + 0.4);
    }
    function bumbo(t, vol) {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      o.connect(g); g.connect(saida); o.start(t); o.stop(t + 0.38);
    }
    function estalo(t, vol) {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 1.1;
      const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.setTargetAtTime(0, t + 0.002, 0.035);
      const src = ctx.createBufferSource(); src.buffer = ruido;
      src.connect(bp); bp.connect(g); g.connect(saida); enviar(g, 0.35); src.start(t, rnd() * 2, 0.25);
    }
    function chocalho(t, vol, pan) {
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6500;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.setTargetAtTime(0, t + 0.01, 0.025);
      const p = ctx.createStereoPanner(); p.pan.value = pan;
      const src = ctx.createBufferSource(); src.buffer = ruido;
      src.connect(hp); hp.connect(g); g.connect(p); p.connect(saida); src.start(t, rnd() * 2, 0.12);
    }
    function subida(t0, t1, vol) {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.3;
      bp.frequency.setValueAtTime(260, t0); bp.frequency.exponentialRampToValueAtTime(6500, t1);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t1 - 0.02); g.gain.linearRampToValueAtTime(0, t1 + 0.02);
      const src = ctx.createBufferSource(); src.buffer = ruido; src.loop = true;
      src.connect(bp); bp.connect(g); g.connect(saida); src.start(t0); src.stop(t1 + 0.05);
    }
    function impacto(t, vol) {
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(85, t); o.frequency.exponentialRampToValueAtTime(36, t + 0.6);
      const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.setTargetAtTime(0, t + 0.01, 0.35);
      o.connect(g); g.connect(saida); o.start(t); o.stop(t + 2);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(4500, t); lp.frequency.exponentialRampToValueAtTime(300, t + 0.8);
      const gn = ctx.createGain(); gn.gain.setValueAtTime(vol * 0.45, t); gn.gain.setTargetAtTime(0, t, 0.2);
      const src = ctx.createBufferSource(); src.buffer = ruido;
      src.connect(lp); lp.connect(gn); gn.connect(saida); enviar(gn, 0.8); src.start(t, 0, 1.5);
    }

    // ii – V – I – vi em Dó, com sétimas e nonas: noite na cidade, sem tristeza
    const ACORDES = [
      { pad: [50, 53, 57, 60, 64], rh: [62, 65, 69, 72], arp: [74, 77, 81, 84], baixo: 38 },
      { pad: [53, 57, 59, 64], rh: [59, 64, 65, 69], arp: [71, 76, 77, 81], baixo: 43 },
      { pad: [48, 52, 55, 59, 62], rh: [60, 64, 67, 71], arp: [72, 76, 79, 83], baixo: 36 },
      { pad: [45, 48, 52, 55, 59], rh: [57, 60, 64, 67], arp: [69, 72, 76, 79], baixo: 45 },
    ];
    const total = Math.ceil(cfg.duracao / bar);
    const cLuz = Math.floor(cfg.luzes / bar);
    const cDrop = Math.round(cfg.drop / bar);
    const cFinal = Math.floor(cfg.marca / bar);
    for (let c = 0; c < total; c++) {
      const t = c * bar;
      const A = ACORDES[c % 4];
      if (c >= cFinal) break;
      const fase = c < cLuz ? 'escuro' : c < cDrop - 1 ? 'cidade' : c < cDrop ? 'subida' : 'drop';
      pad(A.pad, t, bar, fase === 'escuro' ? 0.5 : fase === 'drop' ? 0.46 : 0.38, fase === 'escuro' ? 800 : fase === 'drop' ? 2400 : 1500);
      if (fase === 'escuro') {
        // só o relógio da cidade: tique-taque bem baixo
        for (let i = 0; i < 4; i++) chocalho(t + i * beat, 0.08, i % 2 ? 0.3 : -0.3);
        sub(A.baixo, t, bar * 0.9, 0.16);
        continue;
      }
      // Rhodes no tempo 1 e na antecipação do 3
      A.rh.forEach((m, i) => rhodes(m, t + i * 0.012, fase === 'drop' ? 0.8 : 0.65, bar * 0.55, -0.15));
      A.rh.slice(1).forEach((m, i) => rhodes(m, t + beat * 2.5 + i * 0.012, 0.42, bar * 0.4, 0.15));
      // pluck em colcheias
      [0, 1, 2, 3, 2, 1, 3, 2].forEach((k, i) => pluck(A.arp[k] - (fase === 'drop' ? 0 : 12), t + (i * beat) / 2, i % 2 ? 0.55 : 0.8, fase === 'drop' ? 5200 : 3200));
      sub(A.baixo, t, beat * 1.6, fase === 'drop' ? 0.38 : 0.3);
      sub(A.baixo, t + beat * 2.5, beat * 1.2, fase === 'drop' ? 0.32 : 0.22);
      bumbo(t, fase === 'drop' ? 0.9 : 0.55);
      bumbo(t + beat * 2, fase === 'drop' ? 0.75 : 0.45);
      if (fase === 'drop') { bumbo(t + beat * 2.75, 0.5); estalo(t + beat, 0.42); estalo(t + beat * 3, 0.42); }
      else estalo(t + beat * 3, 0.22);
      for (let i = 0; i < 8; i++) chocalho(t + (i * beat) / 2, fase === 'drop' ? (i % 2 ? 0.12 : 0.06) : (i % 2 ? 0.07 : 0.035), i % 2 ? 0.35 : -0.35);
    }
    // a cidade à noite antes de acender: um zumbido grave e longe
    { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(0.05, 0.8); g.gain.setValueAtTime(0.05, cfg.luzes - 0.6); g.gain.linearRampToValueAtTime(0, cfg.luzes + 0.6);
      const src = ctx.createBufferSource(); src.buffer = ruido; src.loop = true; src.connect(lp); lp.connect(g); g.connect(saida); src.start(0); src.stop(cfg.luzes + 0.7); }
    subida(cfg.drop - bar, cfg.drop, 0.3);
    impacto(cfg.drop, 0.75);

    // Fim: Dó com nona quando a marca pousa, soando até o fim
    const tf = cfg.pouso;
    pad([48, 52, 55, 59, 62], cfg.marca, Math.max(1, cfg.duracao - cfg.marca - 1), 0.45, 1500, 0.8);
    [48, 55, 59, 62, 64, 67].forEach((m, i) => rhodes(m + 12, tf + i * 0.03, 0.7, 3.4, (i - 2.5) * 0.12));
    sub(36, tf, 2.6, 0.5);
    impacto(tf, 0.45);
    saida.gain.setValueAtTime(1, cfg.duracao - 1.8); saida.gain.linearRampToValueAtTime(0, cfg.duracao - 0.05);
    return ctx.startRendering();
  }

  /* ------------------------------ Efeitos ------------------------------ */
  async function efeitos(cfg) {
    const ctx = new OfflineAudioContext(2, Math.ceil(cfg.duracao * SR), SR);
    const rnd = semente(11);
    const ruido = bufferRuido(ctx, rnd, 3);
    const saida = ctx.createGain(); saida.connect(ctx.destination);
    const rev = ctx.createConvolver(); rev.buffer = impulso(ctx, rnd, 1.4, 4);
    const volta = ctx.createGain(); volta.gain.value = 0.25; rev.connect(volta); volta.connect(saida);
    const enviar = (no, quanto) => { const s = ctx.createGain(); s.gain.value = quanto; no.connect(s); s.connect(rev); };
    const tom = (t, f0, f1, dur, vol, tipo = 'sine', pan = 0) => {
      const o = ctx.createOscillator(); o.type = tipo;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const p = ctx.createStereoPanner(); p.pan.value = pan;
      o.connect(g); g.connect(p); p.connect(saida); o.start(t); o.stop(t + dur + 0.02);
      return g;
    };
    const ruidoFiltrado = (t, dur, vol, tipo, f0, f1, q = 0.8, pan0 = 0, pan1 = 0) => {
      const f = ctx.createBiquadFilter(); f.type = tipo; f.Q.value = q;
      f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const p = ctx.createStereoPanner(); p.pan.setValueAtTime(pan0, t); p.pan.linearRampToValueAtTime(pan1, t + dur);
      const src = ctx.createBufferSource(); src.buffer = ruido;
      src.connect(f); f.connect(g); g.connect(p); p.connect(saida); src.start(t, rnd() * 1.5, dur + 0.05);
      return g;
    };
    const sino = (t, f, vol, pan = 0) => { enviar(tom(t, f, f, 0.55, vol, 'sine', pan), 0.45); tom(t, f * 2.76, f * 2.76, 0.2, vol * 0.18, 'sine', pan); };

    const SONS = {
      // a assinatura: as duas notas do "Agora" (si → mi)
      ping: (t, v) => { sino(t, 987.8, v * 0.32); sino(t + 0.085, 1318.5, v * 0.3); },
      whoosh: (t, v) => ruidoFiltrado(t, 0.45, v * 0.45, 'bandpass', 350, 2600, 0.7, -0.5, 0.5),
      risco: (t, v) => ruidoFiltrado(t, 0.7, v * 0.25, 'bandpass', 1200, 5200, 1.2, -0.4, 0.4),
      pop: (t, v) => { tom(t, 520, 980, 0.07, v * 0.45); ruidoFiltrado(t, 0.02, v * 0.1, 'highpass', 3000, 3000); },
      toque: (t, v) => { ruidoFiltrado(t, 0.02, v * 0.25, 'lowpass', 3500, 3500); tom(t, 1500, 1100, 0.03, v * 0.2); },
      // obturador da câmera: dois estalos curtos (abre e fecha) com um corpo grave
      obturador: (t, v) => {
        ruidoFiltrado(t, 0.025, v * 0.4, 'bandpass', 2500, 1800, 0.9); tom(t, 220, 120, 0.04, v * 0.25);
        ruidoFiltrado(t + 0.065, 0.03, v * 0.32, 'bandpass', 3200, 2200, 0.9); tom(t + 0.065, 260, 140, 0.035, v * 0.2);
      },
      carimbo: (t, v) => { tom(t, 110, 45, 0.2, v * 0.8); enviar(ruidoFiltrado(t, 0.08, v * 0.5, 'bandpass', 900, 700, 0.7), 0.6); },
      brilho: (t, v) => { for (let i = 0; i < 12; i++) { const ti = t + rnd() * 0.7; enviar(tom(ti, 2200 + rnd() * 3000, 2000 + rnd() * 2600, 0.12, v * (0.05 + rnd() * 0.07), 'sine', rnd() * 1.4 - 0.7), 0.5); } },
      notificacao: (t, v) => { [[1318.5, 0], [1760, 0.11]].forEach(([f, d]) => { enviar(tom(t + d, f, f, 0.6, v * 0.28), 0.4); tom(t + d, f * 2.76, f * 2.76, 0.25, v * 0.05); }); },
      tique: (t, v) => tom(t, 2800, 2800, 0.008, v * 0.25),
      onda: (t, v) => { enviar(tom(t, 880, 620, 0.5, v * 0.18), 0.7); },
      // o post que acaba: um sopro que sobe e some
      puf: (t, v) => { ruidoFiltrado(t, 0.32, v * 0.3, 'bandpass', 600, 3800, 1.1); tom(t + 0.22, 900, 400, 0.12, v * 0.12); },
      impacto: (t, v) => { tom(t, 80, 40, 0.55, v * 0.8); enviar(ruidoFiltrado(t, 0.5, v * 0.35, 'lowpass', 4000, 300, 0.7), 0.8); },
      pancada: (t, v) => { tom(t, 150, 50, 0.22, v * 0.8); ruidoFiltrado(t, 0.05, v * 0.35, 'lowpass', 2500, 1200); },
      sucesso: (t, v) => { [1046.5, 1318.5, 1568].forEach((f, i) => enviar(tom(t + i * 0.07, f, f, 0.5, v * 0.2), 0.5)); },
      queda: (t, v) => { tom(t, 1400, 420, 0.32, v * 0.12); ruidoFiltrado(t, 0.3, v * 0.14, 'bandpass', 2000, 500, 0.8); },
    };
    for (const e of cfg.eventos) { SONS[e.tipo](e.t, e.vol); }
    return ctx.startRendering();
  }

  window.renderizar = async function (cfg) {
    const [m, e] = await Promise.all([musica(cfg), efeitos(cfg)]);
    return { musica: wavBase64(m), efeitos: wavBase64(e) };
  };
})();
